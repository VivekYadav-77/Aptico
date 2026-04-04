import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const devPort = Number(env.VITE_DEV_PORT || 3000);
  const proxyTarget = env.VITE_API_PROXY_TARGET || 'http://localhost:5000';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      host: env.VITE_DEV_HOST || '0.0.0.0',
      port: Number.isFinite(devPort) ? devPort : 3000,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          ws: true
        },
        '/admin/graphql': {
          target: proxyTarget,
          changeOrigin: true
        },
        '/ping': {
          target: proxyTarget,
          changeOrigin: true
        }
      }
    }
  };
});
