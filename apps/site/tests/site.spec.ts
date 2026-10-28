import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';

for (const colorScheme of ['light', 'dark'] as const) test(`tanıtım sitesi: ${colorScheme}, mağazalar ve telefon/tablet düzeni`, async ({ browser }) => {
  const context = await browser.newContext({ colorScheme });const page = await context.newPage();const apiRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  try {
    await page.goto('http://127.0.0.1:5187/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Çıkmış sorularla');
    const screen = page.getByRole('img', { name: /^ÖGGSor ana ekranı:/ });
    await expect(screen).toBeVisible();
    await expect.poll(() => screen.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth === 780 && img.naturalHeight === 1688)).toBe(true);
    await expect(page.getByText('Örnek veriler', { exact: true })).toBeVisible();
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
      await screen.scrollIntoViewIfNeeded();
      const phone = await page.locator('.phone').boundingBox();
      const image = await screen.boundingBox();
      expect(phone).not.toBeNull();expect(image).not.toBeNull();
      expect(image!.x).toBeGreaterThanOrEqual(phone!.x);
      expect(image!.y).toBeGreaterThanOrEqual(phone!.y);
      expect(image!.x + image!.width).toBeLessThanOrEqual(phone!.x + phone!.width);
      expect(image!.y + image!.height).toBeLessThanOrEqual(phone!.y + phone!.height);
      // The whole screenshot must be visible, including its central working area.
      expect(await screen.evaluate(img => {
        const r = img.getBoundingClientRect();
        return document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2) === img;
      })).toBe(true);
      await page.evaluate(() => window.scrollTo(0, 0));
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

for (const colorScheme of ['light', 'dark'] as const) test(`bilgi sayfaları: ortak tasarım, temiz metin ve ${colorScheme} düzen`, async ({ browser }) => {
  const context = await browser.newContext({ colorScheme });const page = await context.newPage();const apiRequests: string[] = [];
  page.on('request', request => { if (new URL(request.url()).pathname.startsWith('/api/')) apiRequests.push(request.url()); });
  try {
    await page.goto('http://127.0.0.1:5187/');
    const appearance = await page.evaluate(() => ({ background: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.querySelector('.site-header .brand-wordmark')!).fontFamily }));
    for (const [id, title] of [['gizlilik', 'Gizlilik Politikası'], ['kosullar', 'Kullanım Koşulları'], ['destek', 'Destek'], ['hesap-silme', 'Hesap silme']]) {
      const response = await page.goto(`http://127.0.0.1:5187/legal/${id}.html`);
      expect(response?.ok()).toBe(true);
      await expect(page.getByRole('navigation', { name: 'Bilgi ve destek', exact: true }).getByRole('link', { name: title, exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.locator('body').innerText()).not.toMatch(/taslak|hukukçu|\[YÜRÜRLÜK|\[VERBİS|YETKİLİ MAHKEME/i);
      await expect(page.locator('[data-placeholder], script')).toHaveCount(0);
      await expect(page.getByRole('banner').getByRole('link', { name: 'Mağazalar' })).toHaveAttribute('href', '/#indir');
      await expect.poll(() => page.getByRole('contentinfo').locator('.brand img').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => ({ background: getComputedStyle(document.body).backgroundColor, font: getComputedStyle(document.querySelector('.site-header .brand-wordmark')!).fontFamily }))).toEqual(appearance);
      for (const width of [320, 390, 834, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (width === 390 || width === 1280) await page.screenshot({ path: `artifacts/public-site/screens/legal-${id}-${colorScheme}-${width}.png`, fullPage: true });
      }
      if (id === 'gizlilik') {
        await expect(page.getByRole('region', { name: 'İşlenen kişisel veriler' })).toBeVisible();
        await expect(page.locator('main')).toContainText('Codentum L.L.C.');
        await expect(page.locator('main')).toContainText('Haklarını nasıl kullanırsın?');
      }
      if (id === 'hesap-silme') {
        await expect(page.getByRole('link', { name: 'Silme talebi gönder', exact: true })).toHaveAttribute('href', /^mailto:destek@oggsor\.com\?subject=/);
        await expect(page.getByRole('link', { name: 'Hesabım sayfasından giriş yap', exact: true })).toHaveAttribute('href', '/account');
      }
    }
    expect(apiRequests).toEqual([]);
    await page.getByRole('banner').getByRole('link', { name: 'ÖGGSor ana sayfa', exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Çıkmış sorularla');
  } finally { await context.close(); }
});
