import { compatibleBaselineSql } from './baseline-sql.js';
import { INITIAL_SCHEMA_SQL } from './initial-schema.snapshot.js';
import { InitialSchema1794000000000 } from './1794000000000-InitialSchema.js';
import type { QueryRunner } from 'typeorm';

describe('portable baseline JSON defaults', () => {
  it('changes only the two JSON empty-array defaults, preserving all other schema SQL', () => {
    const original = INITIAL_SCHEMA_SQL.join('\n');
    expect(original.match(/json NOT NULL DEFAULT \('\[\]'\)/g)).toHaveLength(2);
    const adapted = INITIAL_SCHEMA_SQL.map(compatibleBaselineSql).join('\n');
    expect(adapted).not.toContain("DEFAULT ('[]')");
    expect(adapted.match(/json NOT NULL DEFAULT \(JSON_ARRAY\(\)\)/g)).toHaveLength(2);
    expect(adapted.replaceAll('json NOT NULL DEFAULT (JSON_ARRAY())', "json NOT NULL DEFAULT ('[]')")).toBe(original);
  });

  it('passes compatible SQL to the query runner for a fresh database', async () => {
    const query = vi.fn().mockResolvedValue([]);
    const runner = { query, connection: { options: {} } } as unknown as QueryRunner;
    await new InitialSchema1794000000000().up(runner);
    expect(query).toHaveBeenCalledTimes(INITIAL_SCHEMA_SQL.length + 1);
    expect(query.mock.calls[1][0]).toContain('`languages` json NOT NULL DEFAULT (JSON_ARRAY())');
    expect(query.mock.calls[1][0]).toContain('`certificates` json NOT NULL DEFAULT (JSON_ARRAY())');
  });

  it('continues refusing partial schemas instead of overwriting data', async () => {
    const query = vi.fn().mockResolvedValue([{ name: 'users' }]);
    const runner = { query, connection: { options: {} } } as unknown as QueryRunner;
    await expect(new InitialSchema1794000000000().up(runner)).rejects.toThrow(/chưa đầy đủ/);
    expect(query).toHaveBeenCalledTimes(1);
  });
});