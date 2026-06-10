import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import process from 'node:process'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendOrigin = env.VITE_BACKEND_ORIGIN || 'http://localhost:8080';

  return {
    plugins: [react()],
    define: {
      global: 'window',
    },
    server: {
      proxy: {
        '/api': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
        '/ws': {
          target: backendOrigin,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
