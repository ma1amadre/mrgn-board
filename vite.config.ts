import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  // GitHub Pages отдаёт сайт из подпути /mrgn-board/ — путь задаёт CI через BASE_PATH.
  // Локально и на любом хостинге с корнем остаётся '/'.
  base: process.env.BASE_PATH ?? '/',
  server: {
    // На Windows «localhost» у vite может забиндиться только на ::1 — явный IPv4,
    // чтобы встроенный браузер ходил по 127.0.0.1.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
