import { defineConfig } from 'vite';

export default defineConfig({
  root: '.', // your project root
  base: '/',
  server: {
    port: 5173,
    open: true,
  },
  resolve: {
    alias: {
      '/classic': '/src/classic',
      '/lib': '/src/lib',
      '/shaders': '/src/shaders',
    },
  },
});
