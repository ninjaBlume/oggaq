import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: process.env.VITE_ADMIN_BASE_PATH ?? '/',
  plugins: [react(), tailwindcss()],
  server: { host: '127.0.0.1', port: 5174, strictPort: true },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
