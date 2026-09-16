import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    css: { postcss: {} },
    resolve: {
      dedupe: ['react', 'react-dom'],
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      proxy: {
        '/api/identity': {
          target: 'http://localhost:8105',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api\/identity/, ''),
        },
        '/v1': 'http://localhost:8091',
        '/mcp-proxy': {
          target: 'http://localhost:8088',
          changeOrigin: true,
          rewrite: (path) => path.replace('/mcp-proxy', '/mcp'),
        },
      },
    },
  };
});