import { defineConfig } from 'vite';

export default defineConfig({
  root: 'web',
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  esbuild: {
    jsx: 'transform',
    jsxFactory: 'm',
    jsxFragment: "'['",
  },
});
