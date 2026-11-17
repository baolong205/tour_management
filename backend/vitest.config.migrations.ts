import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: { globals: true, include: ['test/migrations.integration.ts'], hookTimeout: 60_000, testTimeout: 60_000 },
});
