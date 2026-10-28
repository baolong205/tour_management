import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const target = env.API_PROXY_TARGET || 'http://localhost:3000';
  return {
    esbuild: { jsx: 'automatic' },
    server: { port: 5173, strictPort: true, proxy: { '/api': { target, changeOrigin: true }, '/uploads': { target, changeOrigin: true } } },
  };
});
