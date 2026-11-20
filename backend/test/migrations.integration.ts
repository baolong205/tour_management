import 'reflect-metadata';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { DataSource } from 'typeorm';
import { ALL_ENTITIES } from '../src/common/entities/entity-list.js';
import { ALL_MIGRATIONS } from '../src/database/migrations/index.js';
import { INITIAL_TABLES } from '../src/database/migrations/initial-schema.snapshot.js';
import { PaymentReceipts1794099600000 } from '../src/database/migrations/1794099600000-PaymentReceipts.js';

if (existsSync('.env')) loadEnvFile();

describe('Versioned schema migrations (isolated MySQL)', () => {
  const databases: string[] = [];
  const sources: DataSource[] = [];
  let admin: DataSource;
  const connection = {
    type: 'mysql' as const,
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 3306),
    username: process.env.DB_USERNAME ?? 'root',
    password: process.env.DB_PASSWORD ?? '',
    timezone: '+07:00',
    charset: 'utf8mb4',
  };

  beforeAll(async () => {
    admin = await new DataSource(connection).initialize();
  });
  afterAll(async () => {
    for (const source of sources)
      if (source.isInitialized) await source.destroy();
    if (admin?.isInitialized) {
      for (const database of databases) {
        if (
          !/^tour_migration_test_[a-f0-9]{12}$/.test(database) ||
          database === process.env.DB_DATABASE
        )
          throw new Error('Unsafe test cleanup');
        await admin.query(`DROP DATABASE IF EXISTS \`${database}\``);
      }
      await admin.destroy();
    }
  });

  async function scratch() {
    const database = `tour_migration_test_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
    if (database === process.env.DB_DATABASE)
      throw new Error('Unsafe test database');
    databases.push(database);
    await admin.query(
      `CREATE DATABASE \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    const source = new DataSource({
      ...connection,
      database,
      entities: ALL_ENTITIES,
      migrations: ALL_MIGRATIONS,
      synchronize: false,
    });
    sources.push(source);
    return source.initialize();
  }

  async function marker(source: DataSource) {
    const id = randomUUID();
    await source.query(
      'INSERT INTO users (id, email, full_name, status) VALUES (?, ?, ?, ?)',
      [id, 'preserved@example.test', 'Preserved Customer', 'ACTIVE'],
    );
    return id;
  }

  async function tableExists(source: DataSource, name: string) {
    const rows = await source.query<{ n: number | string }[]>(
      'SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = ?',
      [name],
    );
    return Number(rows[0].n) > 0;
  }

  it('provisions an empty database from migrations, matches entity metadata and reruns without changes', async () => {
    const source = await scratch();
    expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(
      ALL_MIGRATIONS.length,
    );
    const tables = await source.query<{ name: string }[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    );
    expect(tables.map((table) => table.name).sort()).toEqual(
      [...INITIAL_TABLES, 'migrations', 'promotion_scopes', 'promotion_assignments', 'promotion_redemptions', 'booking_discounts'].sort(),
    );
    const id = await marker(source);
    // MySQL normalizes JSON expression defaults; TypeORM may propose these two equivalent ALTERs.
    const changes = (
      await source.driver.createSchemaBuilder().log()
    ).upQueries.map((query) => query.query);
    expect(
      changes.filter(
        (sql) =>
          !/^ALTER TABLE `guide_profiles` CHANGE `(languages|certificates)` `\1` json NOT NULL DEFAULT \('\[\]'\)$/.test(
            sql,
          ),
      ),
    ).toEqual([]);
    await source.query(
      'INSERT INTO guide_profiles (id, user_id) VALUES (?, ?)',
      [randomUUID(), id],
    );
    const [guide] = await source.query<
      { languages: unknown; certificates: unknown }[]
    >('SELECT languages, certificates FROM guide_profiles WHERE user_id = ?', [
      id,
    ]);
    expect(
      typeof guide.languages === 'string'
        ? JSON.parse(guide.languages)
        : guide.languages,
    ).toEqual([]);
    expect(
      typeof guide.certificates === 'string'
        ? JSON.parse(guide.certificates)
        : guide.certificates,
    ).toEqual([]);
    expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(0);
    expect(
      await source.query('SELECT id FROM users WHERE id = ?', [id]),
    ).toEqual([{ id }]);
  });

  it('adopts an existing entity-created schema and preserves customer/support records', async () => {
    const source = await scratch();
    await source.synchronize(); // Test database only: simulates the previous installation method.
    const id = await marker(source);
    const ticketId = randomUUID();
    await source.query(
      'INSERT INTO support_tickets (id, customer_id, customer_name, subject, message, replies) VALUES (?, ?, ?, ?, ?, ?)',
      [
        ticketId,
        id,
        'Preserved Customer',
        'Existing support',
        'Keep this message',
        '[]',
      ],
    );
    expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(
      ALL_MIGRATIONS.length,
    );
    expect(
      await source.query(
        'SELECT id, message FROM support_tickets WHERE id = ?',
        [ticketId],
      ),
    ).toEqual([{ id: ticketId, message: 'Keep this message' }]);
    expect(
      await source.query('SELECT id FROM users WHERE id = ?', [id]),
    ).toEqual([{ id }]);
  });

  it('upgrades a legacy database that already recorded PaymentReceipts and is missing support', async () => {
    const source = await scratch();
    await source.synchronize();
    const id = await marker(source);
    await source.query('DROP TABLE support_tickets');
    const options = source.options;
    await source.destroy();
    const legacy = new DataSource({
      ...options,
      migrations: [PaymentReceipts1794099600000],
    });
    sources.push(legacy);
    await legacy.initialize();
    expect(await legacy.runMigrations({ transaction: 'each' })).toHaveLength(1);
    await legacy.destroy();
    // Reconnect with the same registry used by the CLI to test an older baseline adoption.
    const upgraded = new DataSource({ ...options, migrations: ALL_MIGRATIONS });
    sources.push(upgraded);
    await upgraded.initialize();
    expect(await upgraded.runMigrations({ transaction: 'each' })).toHaveLength(
      ALL_MIGRATIONS.length - 1,
    );
    expect(await tableExists(upgraded, 'support_tickets')).toBe(true);
    expect(
      await upgraded.query('SELECT id FROM users WHERE id = ?', [id]),
    ).toEqual([{ id }]);
    expect(await upgraded.runMigrations({ transaction: 'each' })).toHaveLength(
      0,
    );
  });

  it('upgrades legacy promotions without losing data and supports the booking promotion join', async () => {
    const source = await scratch();
    const runner = source.createQueryRunner();
    try {
      // Simulate an installation created before campaign columns and migration history.
      for (const Migration of ALL_MIGRATIONS.slice(0, -1)) {
        await new Migration().up(runner);
      }
      expect(await runner.hasColumn('promotions', 'name')).toBe(false);
      const id = randomUUID();
      await source.query(
        `INSERT INTO promotions
          (id, code, type, value, used_count, valid_from, valid_to)
         VALUES (?, ?, 'FIXED_AMOUNT', 50000, 2, '2026-01-01', '2027-01-01')`,
        [id, 'LEGACY50K'],
      );

      expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(
        ALL_MIGRATIONS.length,
      );
      const promotion = await source.getRepository('Promotion').findOneByOrFail({ id });
      expect(promotion).toMatchObject({
        id, code: 'LEGACY50K', value: 50000, usedCount: 2,
        name: null, status: 'ACTIVE', kind: 'PUBLIC',
      });
      await expect(
        source.getRepository('Booking').createQueryBuilder('booking')
          .leftJoinAndSelect('booking.promotion', 'promotion')
          .getManyAndCount(),
      ).resolves.toEqual([[], 0]);
      expect(await source.runMigrations({ transaction: 'each' })).toHaveLength(0);
    } finally {
      await runner.release();
    }
  });

  it('rejects a partial schema without altering existing tables or data', async () => {
    const source = await scratch();
    await source.query(
      'CREATE TABLE users (id INT PRIMARY KEY, marker VARCHAR(30))',
    );
    await source.query("INSERT INTO users VALUES (1, 'keep me')");
    await expect(source.runMigrations({ transaction: 'each' })).rejects.toThrow(
      /chưa đầy đủ/,
    );
    expect(await source.query('SELECT * FROM users')).toEqual([
      { id: 1, marker: 'keep me' },
    ]);
    expect(await tableExists(source, 'support_tickets')).toBe(false);
    expect(await tableExists(source, 'mail_messages')).toBe(false);
  });
});
