import { defineConfig } from '@playwright/test';
import path from 'node:path';
const root = path.resolve(__dirname, '../..');
export default defineConfig({
  testDir: './tests', workers: 1, retries: 0, timeout: 30000,
  outputDir: path.join(root, 'artifacts/public-site/test-results'),
  reporter: 'list', use: { browserName: 'chromium', viewport: { width: 390, height: 1000 } },
  webServer: [
    { command: 'npm exec --workspace @oggaq/web -- vite preview --outDir ../site/dist --host 127.0.0.1 --port 5187 --strictPort', cwd: root, url: 'http://127.0.0.1:5187', reuseExistingServer: false },
    { command: 'npm exec --workspace @oggaq/web -- vite preview --outDir dist --host 127.0.0.1 --port 5188 --strictPort', cwd: root, url: 'http://127.0.0.1:5188/account', reuseExistingServer: false },
  ],
});
