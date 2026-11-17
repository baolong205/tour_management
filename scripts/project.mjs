import { copyFile, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { root } from './config.mjs';
import { startNpm, finished, stopChild } from './process.mjs';

let active;
let interrupted = false;
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
  interrupted = true;
  if (active) await stopChild(active);
  process.exitCode = 130;
});

async function run(directory, args) {
  if (interrupted) throw new Error('Đã dừng.');
  console.log(`\n[${directory || 'tourgo'}] npm ${args.join(' ')}`);
  active = startNpm(directory, args);
  await finished(active);
  active = undefined;
}

try {
  switch (process.argv[2]) {
    case 'setup': {
      const target = join(root, 'backend', '.env');
      const example = await readFile(join(root, 'backend', '.env.example'), 'utf8');
      const contents = example
        .replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${randomBytes(48).toString('hex')}`)
        .replace(/^JWT_REFRESH_SECRET=.*$/m, `JWT_REFRESH_SECRET=${randomBytes(48).toString('hex')}`)
        .replace(/^PAYMENT_MOCK_SECRET=.*$/m, `PAYMENT_MOCK_SECRET=${randomBytes(32).toString('hex')}`);
      try {
        await writeFile(target, contents, { flag: 'wx', mode: 0o600 });
        console.log('Đã tạo backend/.env với khóa ngẫu nhiên. Điền cấu hình MySQL trước khi chạy.');
      } catch (error) {
        if (error.code !== 'EEXIST') throw error;
        console.log('Giữ nguyên backend/.env hiện có.');
      }
      try {
        await copyFile(join(root, 'frontend', '.env.example'), join(root, 'frontend', '.env'), constants.COPYFILE_EXCL);
      } catch (error) { if (error.code !== 'EEXIST') throw error; }
      for (const directory of ['backend', 'frontend', 'mobile']) await run(directory, ['ci']);
      console.log('\nCài đặt xong. Khởi tạo database theo README, sau đó chạy npm run dev.');
      break;
    }
    case 'build':
      for (const directory of ['backend', 'frontend']) await run(directory, ['run', 'build']);
      await run('mobile', ['run', 'export:check']);
      break;
    case 'check':
      await run('', ['test']);
      for (const directory of ['backend', 'frontend']) {
        await run(directory, ['run', 'build']);
        await run(directory, ['run', 'lint']);
        await run(directory, ['test']);
      }
      for (const script of ['typecheck', 'lint', 'test']) await run('mobile', ['run', script]);
      break;
    case 'integration':
      for (const script of ['test:migrations', 'test:e2e', 'test:checkout', 'test:search']) await run('backend', ['run', script]);
      break;
    default: throw new Error('Lệnh không hợp lệ: setup | build | check | integration.');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = interrupted ? 130 : 1;
}
