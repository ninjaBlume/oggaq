import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

for (const colorScheme of ['light', 'dark'] as const) test(`tanıtım sitesi: ${colorScheme}, mağazalar ve telefon/tablet düzeni`, async ({ browser }) => {
  const context = await browser.newContext({ colorScheme });const page = await context.newPage();const apiRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  try {
    await page.goto('http://127.0.0.1:5187/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Hazırlığın');
    await expect(page.getByRole('group', { name: 'App Store: yakında', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Google Play: yakında', exact: true })).toBeVisible();
    await expect(page.getByRole('textbox')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /üzerinden indir/ })).toHaveCount(0);
    await expect(page.locator('script')).toHaveCount(0);
    await expect(page.getByRole('link', { name: /giriş yap|kayıt ol|sınava gir/i })).toHaveCount(0);
    mkdirSync('artifacts/public-site/screens', { recursive: true });
    for (const width of [320, 390, 834, 1280]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `artifacts/public-site/screens/${colorScheme}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
    expect(apiRequests).toEqual([]);
    await page.getByRole('link', { name: 'Gizlilik Politikası', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Gizlilik Politikası ve KVKK Aydınlatma Metni', exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test('hesap modu: parola yenileme bağlantısı ve sorgu parametreleri korunur', async ({ page }) => {
  await page.goto('http://127.0.0.1:5188/reset-password?token=synthetic-preview-token&email=preview%40example.test');
  await expect(page.getByLabel('E-posta adresi', { exact: true })).toHaveValue('preview@example.test');
  await expect(page.getByRole('button', { name: 'Parolayı yenile', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Deneme sınavları', exact: true })).toHaveCount(0);
});

test('hesap modu: giriş ekranı yalnız hesap işlemlerini sunar', async ({ page }) => {
  await page.route('**/api/v1/me', route => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ message: 'Unauthenticated.' }) }));
  await page.goto('http://127.0.0.1:5188/account');
  await expect(page.getByRole('button', { name: 'Giriş yap', exact: true })).toBeVisible();
  await expect(page.getByText('Hesap ve güvenlik işlemlerin için giriş yap.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hesap oluştur', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /Deneme sınavları/ })).toHaveCount(0);
});
