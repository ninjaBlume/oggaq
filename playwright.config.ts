import { defineConfig } from '@playwright/test';
import { existsSync } from 'node:fs';

const php = process.env.PHP_BINARY ?? (existsSync('/opt/homebrew/opt/php@8.4/bin/php') ? '/opt/homebrew/opt/php@8.4/bin/php' : 'php');
export const browserTestEnv = {
  ...process.env,
  APP_ENV: 'local', APP_DEBUG: 'false', APP_URL: 'http://127.0.0.1:8001',
  DB_CONNECTION: 'pgsql', DB_DATABASE: 'oggaq_test', DB_URL: '',
  MOBILE_WEB_PREVIEW_URL: 'http://127.0.0.1:5185', ADMIN_URL: 'http://127.0.0.1:5184', FRONTEND_URL: 'http://127.0.0.1:5183',
  SANCTUM_STATEFUL_DOMAINS: '127.0.0.1:5184,127.0.0.1:5183,127.0.0.1:8001',
  SESSION_DOMAIN: '', SESSION_SECURE_COOKIE: 'false',
  SESSION_DRIVER: 'database', SESSION_ENCRYPT: 'true', CACHE_STORE: 'database', CACHE_PREFIX: 'oggaq_browser_tests',
  MAIL_MAILER: 'array', QUEUE_CONNECTION: 'sync', HASH_DRIVER: 'argon2id', ARGON_MEMORY: '1024', ARGON_TIME: '1',
};
export const phpBinary = php;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  outputDir: 'artifacts/playwright-results',
  reporter: [['list'], ['html', { outputFolder: 'artifacts/playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:5184', browserName: 'chromium', viewport: { width: 1440, height: 960 }, screenshot: 'only-on-failure', trace: 'off' },
  webServer: [
    { command: 'node scripts/mobile-preview.mjs', url: 'http://127.0.0.1:5185', reuseExistingServer: false, timeout: 30_000 },
    { command: `${php} artisan serve --host=127.0.0.1 --port=8001 --no-reload`, cwd: 'backend', env: browserTestEnv, url: 'http://127.0.0.1:8001/up', reuseExistingServer: false, timeout: 30_000 },
    { command: 'npm run dev --workspace @oggaq/web -- --port 5183', env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:8001' }, url: 'http://127.0.0.1:5183', reuseExistingServer: false, timeout: 30_000 },
    { command: 'npm run dev --workspace @oggaq/admin -- --port 5184', env: { ...process.env, VITE_API_URL: 'http://127.0.0.1:8001' }, url: 'http://127.0.0.1:5184', reuseExistingServer: false, timeout: 30_000 },
  ],
});
