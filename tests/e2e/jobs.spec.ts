import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture, login } from './student';
const web = 'http://127.0.0.1:5183'; const admin = 'http://127.0.0.1:5184'; const mobile = 'http://127.0.0.1:5185';
test.use({ baseURL: web });
test.beforeEach(() => { fixture('setup-study'); });
test.afterAll(() => fixture('cleanup'));
async function adminLogin(page: Page) { await page.goto(`${admin}/is-ilanlari`); await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-admin@example.test'); await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!'); await page.getByRole('button', { name: 'Giriş yap', exact: true }).click(); await expect(page.getByRole('heading', { name: 'İş Başvuruları', exact: true })).toBeVisible(); }
async function mobileLogin(page: Page) { await page.goto(mobile); await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test'); await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!'); await page.getByRole('button', { name: 'Giriş yap', exact: true }).click(); await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click(); await page.getByRole('button', { name: 'İş Başvuruları', exact: true }).click(); }

test('admin ilan ekler ve yayımlar; öğrenci başvurur; admin durumu günceller; öğrenci kendi başvurusunu görür', async ({ browser, page }) => {
  const adminContext = await browser.newContext(); const manager = await adminContext.newPage();
  try {
    await adminLogin(manager); await manager.getByRole('link', { name: 'İlan ekle', exact: true }).click();
    await manager.getByLabel('İlan başlığı').fill('E2E ÖGG iş ilanı'); await manager.getByLabel('Firma adı').fill('Sentetik firma'); await manager.getByLabel('Şehir / konum').fill('Ankara'); await manager.getByLabel('İlan açıklaması').fill('Sentetik iş ilanıdır. Yalnız geliştirme testi içindir.');
    await manager.getByRole('button', { name: 'İlanı kaydet', exact: true }).click(); await expect(manager.getByRole('heading', { name: 'İlanı düzenle' })).toBeVisible();
    await login(page); await page.getByRole('link', { name: 'İş Başvuruları', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Henüz açık iş ilanı yok' })).toBeVisible();
    await manager.getByLabel('Yayın durumu').selectOption('published'); const published = manager.waitForResponse((r) => r.url().includes('/admin/job-postings/') && r.request().method() === 'PATCH' && r.status() === 200); await manager.getByRole('button', { name: 'İlanı kaydet', exact: true }).click(); await published;
    await page.reload(); await page.getByRole('button', { name: 'İlanı incele', exact: true }).click(); await page.getByLabel('Telefon', { exact: true }).fill('0555 123 45 67'); await page.getByLabel('Kısa ön yazı (isteğe bağlı)').fill('E2E sentetik aday ön yazısı.');
    await expect(page.getByText(/platform yöneticisi tarafından görülebilir/)).toBeVisible(); await page.getByRole('button', { name: 'Başvur', exact: true }).click(); await expect(page.getByRole('status')).toContainText('Başvurun alındı.');
    await page.getByRole('button', { name: 'Başvurularımı gör' }).click(); await expect(page.getByText('Başvuru alındı', { exact: true })).toBeVisible();
    await manager.reload(); await expect(manager.getByRole('heading', { name: 'E2E öğrencisi', exact: true })).toBeVisible(); await manager.getByLabel('E2E öğrencisi başvuru durumu').selectOption('reviewing'); const reviewed = manager.waitForResponse((r) => r.url().includes('/admin/job-applications/') && r.status() === 200); await manager.getByRole('button', { name: 'Durumu kaydet' }).click(); await reviewed;
    await page.getByRole('button', { name: 'Başvuruları yenile' }).click(); await expect(page.getByText('İnceleniyor', { exact: true })).toBeVisible();
    await manager.getByLabel('Yayın durumu').selectOption('closed'); const closed = manager.waitForResponse((r) => r.url().includes('/admin/job-postings/') && r.request().method() === 'PATCH' && r.status() === 200); await manager.getByRole('button', { name: 'İlanı kaydet', exact: true }).click(); await closed;
    await page.getByRole('button', { name: 'İlanlar', exact: true }).click(); await page.reload(); await expect(page.getByRole('heading', { name: 'Henüz açık iş ilanı yok' })).toBeVisible(); await page.getByRole('button', { name: 'Başvurularım', exact: true }).click(); await expect(page.getByText('E2E ÖGG iş ilanı', { exact: true })).toBeVisible();
  } finally { await adminContext.close(); }
});

test('mobil menüden başvuru; yanıt kaybında tekrar ikinci başvuru üretmez', async ({ page }) => {
  fixture('jobs'); await page.setViewportSize({ width: 390, height: 844 }); await mobileLogin(page);
  await expect(page.getByText('Sentetik ÖGG ilanı draft', { exact: true })).toHaveCount(0); await page.getByRole('button', { name: 'İlanı incele', exact: true }).click(); await page.getByLabel('Telefon', { exact: true }).fill('0555 333 22 11'); await page.getByLabel('Kısa ön yazı (isteğe bağlı)').fill('Mobil sentetik başvuru.');
  let lost = true; await page.route('**/job-postings/*/applications', async (route) => { if (lost) { lost = false; await route.fetch(); await route.abort('internetdisconnected'); } else await route.continue(); });
  await page.getByRole('button', { name: 'Başvur', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible(); await page.getByRole('button', { name: 'Başvur', exact: true }).click(); await expect(page.getByText('Başvurun alındı.', { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Başvurularımı gör', exact: true }).click(); await expect(page.getByText('Mobil sentetik başvuru.', { exact: true })).toBeVisible(); await expect(page.getByText('Sentetik ÖGG ilanı published', { exact: true })).toHaveCount(1);
});

test('web ilan hizmeti hatasını gösterir; tekrar yükler ve başvuru doğrulamasını korur', async ({ page }) => {
  fixture('jobs'); await login(page); let fail = true; await page.route('**/api/v1/job-postings?*', async (route) => fail ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'İlan hizmeti geçici olarak kullanılamıyor.' }) }) : route.continue());
  await page.getByRole('link', { name: 'İş Başvuruları', exact: true }).click(); await expect(page.getByRole('alert')).toBeVisible(); fail = false; await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click(); await page.getByRole('button', { name: 'İlanı incele', exact: true }).click(); await page.getByLabel('Telefon', { exact: true }).fill('invalid-phone'); await page.getByRole('button', { name: 'Başvur', exact: true }).click(); await expect(page.getByLabel('Telefon', { exact: true })).toHaveAttribute('aria-invalid', 'true'); await expect(page.getByRole('button', { name: 'Başvur', exact: true })).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) test(`iş ilanı ekranları ${scheme} temada telefon/tablet/masaüstünde taşmaz`, async ({ browser }) => {
  fixture('jobs'); mkdirSync('artifacts/jobs-preview', { recursive: true });
  for (const surface of ['web', 'mobile', 'admin'] as const) {
    const context = await browser.newContext({ baseURL: web, colorScheme: scheme, viewport: { width: 390, height: 844 } }); const page = await context.newPage();
    try {
      if (surface === 'admin') await adminLogin(page); else if (surface === 'mobile') await mobileLogin(page); else { await login(page); await page.getByRole('link', { name: 'İş Başvuruları', exact: true }).click(); }
      await expect(page.getByText('Sentetik ÖGG ilanı published', { exact: true })).toBeVisible();
      for (const width of [320, 834, 1280]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `artifacts/jobs-preview/${surface}-${scheme}-${width}.png`, fullPage: true, animations: 'disabled' }); }
      if (surface === 'admin') { await page.getByRole('link').filter({ hasText: 'Sentetik ÖGG ilanı published' }).click(); } else { await page.getByRole('button', { name: 'İlanı incele', exact: true }).click(); }
      await expect(page.getByLabel(surface === 'admin' ? 'İlan başlığı' : 'Telefon', { exact: true })).toBeVisible();
      for (const width of [320, 834]) { await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await page.screenshot({ path: `artifacts/jobs-preview/${surface}-${scheme}-detail-${width}.png`, fullPage: true, animations: 'disabled' }); }
    } finally { await context.close(); }
  }
});
