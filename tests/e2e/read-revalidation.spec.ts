import { test, expect, type Page } from '@playwright/test';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 844 } });
test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('upcoming-calendar'); });
test.afterAll(() => fixture('cleanup'));
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByTestId('home-summary').getByLabel('Değerlendirilen soru: 0', { exact: true })).toBeVisible();
  await expect(page.getByTestId('upcoming-exam')).toBeVisible();
  await expect(page.getByText('İlk sınavın burada', { exact: true })).toBeVisible();
  await page.evaluate(() => {
    const state = window as unknown as { readFlashes: string[] }; state.readFlashes = [];
    new MutationObserver(() => {
      for (const node of document.querySelectorAll('[data-testid="read-error-notice"]'))
        if ((node as HTMLElement).offsetParent) state.readFlashes.push(node.textContent ?? '');
    }).observe(document.body, { childList: true, subtree: true });
  });
}
async function visibility(page: Page, value: 'hidden' | 'visible') {
  await page.evaluate(state => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: state });
    document.dispatchEvent(new Event('visibilitychange'));
  }, value);
}
async function returnHome(page: Page) {
  await page.getByRole('tab', { name: 'Profil', exact: true }).click();
  await page.getByRole('tab', { name: 'Ana sayfa', exact: true }).click();
}
const endpoints = ['**/contexts/*/stats', '**/contexts/*/exam-attempts?per_page=3', '**/exam-calendar/next'];
test('ana sayfa tek geçici hatayı görünür hata üretmeden kurtarır; içerik kaybolmaz', async ({ page }) => {
  await login(page); const calls = [0, 0, 0];
  for (const [index, path] of endpoints.entries()) await page.route(path, route => ++calls[index] === 1 ? route.abort('timedout') : route.continue());
  await returnHome(page);
  await expect(page.getByTestId('home-summary').getByLabel('Değerlendirilen soru: 0', { exact: true })).toBeVisible();
  await expect(page.getByText('İlk sınavın burada', { exact: true })).toBeVisible();
  await expect.poll(() => calls).toEqual([2, 2, 2]);
  await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { readFlashes: string[] }).readFlashes)).toEqual([]);
});
test('kalıcı kesintide içerik kalır; nötr durumdan yeniden deneme iyileştirir', async ({ page }) => {
  await login(page); let offline = true;
  for (const path of endpoints) await page.route(path, route => offline ? route.abort('internetdisconnected') : route.continue());
  await returnHome(page);
  await expect(page.getByTestId('read-connection-notice')).toHaveCount(3);
  await expect(page.getByTestId('home-summary').getByLabel('Değerlendirilen soru: 0', { exact: true })).toBeVisible();
  await expect(page.getByTestId('upcoming-exam')).toBeVisible();
  await expect(page.getByText('İlk sınavın burada', { exact: true })).toBeVisible();
  await expect(page.getByTestId('home-summary')).toContainText('Son yüklenen bilgiler gösteriliyor');
  offline = false;
  await page.getByTestId('home-summary').getByRole('button', { name: 'Yeniden dene', exact: true }).click();
  await expect(page.getByTestId('home-summary').getByRole('alert')).toHaveCount(0);
  await returnHome(page); await expect(page.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { readFlashes: string[] }).readFlashes)).toEqual([]);
});
test('iptal edilen eski özet cevabı yeni başarılı okumaya hata ekleyemez', async ({ page }) => {
  await login(page); let release!: () => void; let arrived!: () => void; let calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { arrived = resolve; });
  await page.route(endpoints[0], async route => {
    if (++calls !== 1) return route.continue();
    arrived(); await gate;
    await route.fulfill({ status: 504, json: { detail: 'Synthetic stale timeout' } });
  });
  await returnHome(page); await started;
  const cancelled = page.waitForEvent('requestfailed', request => new URL(request.url()).pathname.endsWith('/stats'));
  await visibility(page, 'hidden'); await cancelled;
  const recovered = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/stats') && response.ok());
  await visibility(page, 'visible'); await recovered; release();
  await expect(page.getByTestId('home-summary').getByLabel('Değerlendirilen soru: 0', { exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0); expect(calls).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { readFlashes: string[] }).readFlashes)).toEqual([]);
});
for (const status of [403, 422, 429]) test(`gerçek ${status} hatası gizlenmez veya tekrar gönderilmez`, async ({ page }) => {
  await login(page); let calls = 0;
  await page.route(endpoints[0], route => { calls++; return route.fulfill({ status, json: { message: 'Synthetic permanent error' } }); });
  await returnHome(page);
  await expect(page.getByTestId('home-summary').getByTestId('read-error-notice')).toContainText('Özet bilgilerin yüklenemedi');
  await expect(page.getByTestId('home-summary').getByTestId('read-connection-notice')).toHaveCount(0);
  expect(calls).toBe(1);
});

test('ilk ilan okuması arka planda iptal edilince boş veriyle çökmez; dönüşte yüklenir', async ({ page }) => {
  await login(page); let release!: () => void; let arrived!: () => void; let calls = 0;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { arrived = resolve; });
  const crashes: string[] = []; page.on('pageerror', error => crashes.push(error.message));
  await page.route('**/api/v1/job-postings?*', async route => {
    if (++calls !== 1) return route.continue();
    arrived(); await gate;
    await route.fulfill({ status: 504, json: { detail: 'Synthetic stale job read' } });
  });
  await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'İş İlanları', exact: true }).click();
  await started;
  const cancelled = page.waitForEvent('requestfailed', request => new URL(request.url()).pathname.endsWith('/job-postings'));
  await visibility(page, 'hidden'); await cancelled;
  await expect(page.getByRole('progressbar', { name: 'İş ilanları yükleniyor', exact: true })).toBeVisible();
  const loaded = page.waitForResponse(response => new URL(response.url()).pathname.endsWith('/job-postings') && response.ok());
  await visibility(page, 'visible'); await loaded; release();
  await expect(page.getByRole('progressbar', { name: 'İş ilanları yükleniyor', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'İş İlanları', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0); expect(crashes).toEqual([]); expect(calls).toBe(2);
});

test('gizli ana sayfa arka plandan dönüşte gereksiz okuma başlatmaz', async ({ page }) => {
  await login(page); let calls = 0;
  await page.getByRole('tab', { name: 'Profil', exact: true }).click();
  for (const path of endpoints) await page.route(path, route => { calls++; return route.continue(); });
  const resumed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/v1/me/contexts' && response.ok());
  await visibility(page, 'hidden'); await visibility(page, 'visible'); await resumed;
  await expect(page.getByRole('heading', { name: 'Profil', exact: true })).toBeVisible();
  expect(calls).toBe(0);
});
