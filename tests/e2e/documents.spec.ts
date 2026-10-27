import { test, expect } from '@playwright/test';
import { fixture } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(async ({ page }) => {
  fixture('setup-study');
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(mobilePreviewUrl);
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByTestId('main-header')).toBeVisible();
});
test.afterAll(() => fixture('cleanup'));

// Production nginx adds this policy in addition to the controller's nonce policy.
// Both policies must permit the handoff; inline script would be blocked by nginx.
test.beforeEach(async ({ context }) => {
  await context.route('**/api/v1/document-exports/viewer', async route => {
    const response = await route.fetch();
    const headers = response.headers();
    headers['content-security-policy'] += ", default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; object-src 'none'";
    await route.fulfill({ response, headers });
  });
});

test('dilekçe: gerçek API ile taslak, düzenleme, önizleme ve tek kullanımlık PDF', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
  await page.getByRole('button', { name: 'Dilekçe hazırla', exact: true }).click();
  const create = page.getByRole('button', { name: 'Taslağı oluştur', exact: true });
  await expect(create).toBeDisabled();
  await expect(page.getByText('ÖGG SOR için hazırlanmış özgün ve düzenlenebilir örnektir.', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /Üniversitesi|Emniyet Müdürlüğü/ })).toHaveCount(0);
  await page.getByLabel('Talep veya bildirim', { exact: true }).fill('Görev çizelgemin bir örneğini talep ediyorum.');
  await page.getByLabel('Açıklama / gerekçe', { exact: true }).fill('Sentetik kayıt kontrolü.');
  await create.click();
  await expect(page.getByLabel('Belge metni', { exact: true })).toContainText('Görev çizelgemin');
  await page.getByLabel('Belge başlığı', { exact: true }).fill('Sentetik çizelge talebi');
  await page.getByLabel('Muhatap / birim (isteğe bağlı)', { exact: true }).fill('Örnek Güvenlik Müdürlüğüne');
  await page.getByLabel('Belge tarihi (gg/aa/yyyy, isteğe bağlı)', { exact: true }).fill('28/10/2026');
  await page.getByLabel('İmza 1 · adı soyadı (isteğe bağlı)', { exact: true }).fill('Örnek Öğrenci');
  await page.getByRole('button', { name: 'Metni önizle', exact: true }).click();
  await expect(page.getByText('Sentetik çizelge talebi', { exact: true })).toBeVisible();
  await expect(page.getByText('Tarih: 28/10/2026', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Kapat', exact: true }).click();
  const exported = page.waitForResponse(r => r.url().endsWith('/api/v1/document-exports') && r.request().method() === 'POST');
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'PDF aç / indir', exact: true }).click();
  const viewer = await popup;
  await expect(viewer.getByRole('heading', { name: 'Belgen hazır' })).toBeVisible();
  await expect(viewer).not.toHaveURL(/#/);
  const originalUrl = (await (await exported).json()).data.viewer_url as string;
  const changed = new URL(originalUrl); changed.hash = 'a'.repeat(64);
  await viewer.goto(changed.toString());
  await expect(viewer).not.toHaveURL(/#/);
  await expect(viewer.locator('#ticket')).toHaveValue('a'.repeat(64));
  await viewer.goto(originalUrl);
  await expect(viewer).not.toHaveURL(/#/);
  expect(await viewer.locator('#ticket').inputValue() === new URL(originalUrl).hash.slice(1)).toBe(true);
  const response = viewer.waitForResponse(r => r.url().endsWith('/document-exports/open'));
  await viewer.getByRole('button', { name: 'PDF’yi aç', exact: true }).click();
  const pdf = await response;
  expect(pdf.status()).toBe(200);
  expect(pdf.headers()['content-type']).toBe('application/pdf');
  await page.screenshot({ path: 'artifacts/documents/petition-phone.png', fullPage: true });
});

test('tutanak: matbu PDF ve serbest metin, rol düzenleme; telefon/tablet taşma kontrolü', async ({ page, context }) => {
  await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
  await page.getByRole('button', { name: 'Tutanak hazırla', exact: true }).click();
  await page.getByRole('button', { name: 'Olay / tespit tutanağı', exact: true }).click();
  await page.getByRole('button', { name: 'Teslim-tesellüm tutanağı', exact: true }).click();
  await expect(page.getByLabel('Teslim tarihi (gg/aa/yyyy)', { exact: true })).toHaveAttribute('placeholder', 'gg/aa/yyyy');
  await page.getByRole('button', { name: 'Matbu örnek', exact: true }).click();
  await expect(page.getByLabel('Belge metni', { exact: true })).toHaveCount(0);
  const popup = context.waitForEvent('page');
  await page.getByRole('button', { name: 'PDF aç / indir', exact: true }).click();
  const viewer = await popup;
  const response = viewer.waitForResponse(r => r.url().endsWith('/document-exports/open'));
  await viewer.getByRole('button', { name: 'PDF’yi aç', exact: true }).click();
  expect((await response).status()).toBe(200);
  await viewer.close();
  await page.getByRole('button', { name: 'Serbest düzenleme', exact: true }).click();
  await page.getByLabel('Belge metni', { exact: true }).fill('Sentetik eşya, sağlam durumda teslim edildi.');
  await expect(page.getByLabel('İmza 1 · rol', { exact: true })).toHaveValue('Teslim eden');
  await expect(page.getByLabel('İmza 2 · rol', { exact: true })).toHaveValue('Teslim alan');
  await page.getByRole('button', { name: '2. imza alanını kaldır', exact: true }).click();
  await page.getByRole('button', { name: 'İmza alanı ekle', exact: true }).click();
  await expect(page.getByLabel('İmza 2 · rol', { exact: true })).toHaveValue('İlgili');
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'artifacts/documents/report-tablet.png', fullPage: true });
});

test('taslak isteği başarısız olunca girilen metin korunur ve tekrar oluşturulabilir', async ({ page }) => {
  await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
  await page.getByRole('button', { name: 'Dilekçe hazırla', exact: true }).click();
  await page.getByLabel('Talep veya bildirim', { exact: true }).fill('Sentetik talep');
  await page.getByLabel('Açıklama / gerekçe', { exact: true }).fill('Sentetik açıklama');
  await page.route('**/api/v1/documents/prepare', route => route.fulfill({ status: 503, contentType: 'application/problem+json', body: JSON.stringify({ title: 'Geçici sorun', detail: 'Yeniden deneyebilirsin.' }) }));
  await page.getByRole('button', { name: 'Taslağı oluştur', exact: true }).click();
  await expect(page.getByText('Yeniden deneyebilirsin.', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Talep veya bildirim', { exact: true })).toHaveValue('Sentetik talep');
  await page.unroute('**/api/v1/documents/prepare');
  await page.getByRole('button', { name: 'Taslağı oluştur', exact: true }).click();
  await expect(page.getByLabel('Belge metni', { exact: true })).toContainText('Sentetik talep');
});


test('izin tarihleri gg/aa/yyyy girilir; ters tarih aralığı açıklanır ve düzeltilince özgün metin oluşur', async ({ page }) => {
  await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
  await page.getByRole('button', { name: 'Dilekçe hazırla', exact: true }).click();
  await page.getByRole('button', { name: 'Genel talep / bildirim', exact: true }).click();
  await page.getByRole('button', { name: 'İzin talebi', exact: true }).click();
  // Wait for the closing sheet's focus restoration before typing into the form.
  await expect(page.getByRole('button', { name: 'Kapat', exact: true, includeHidden: true })).toHaveCount(0);
  await page.getByLabel('İzin başlangıç tarihi (gg/aa/yyyy)', { exact: true }).fill('28/10/2026');
  await page.getByLabel('İzin bitiş tarihi (gg/aa/yyyy)', { exact: true }).fill('27/10/2026');
  await page.getByLabel('İzin talebi ve açıklama', { exact: true }).fill('Sentetik açıklama');
  await page.getByRole('button', { name: 'Taslağı oluştur', exact: true }).click();
  await expect(page.getByText('İzin bitiş tarihi başlangıç tarihinden önce olamaz.', { exact: true })).toBeVisible();
  const end = page.getByLabel('İzin bitiş tarihi (gg/aa/yyyy)', { exact: true });
  await end.fill('29/10/2026');
  await expect(end).toHaveValue('29/10/2026');
  await page.getByRole('button', { name: 'Taslağı oluştur', exact: true }).click();
  await expect(page.getByLabel('Belge metni', { exact: true })).toContainText('28/10/2026 - 29/10/2026 tarihleri arasında izin kullanmak istiyorum.');
  await expect(page.getByLabel('Belge tarihi (gg/aa/yyyy, isteğe bağlı)', { exact: true })).toHaveAttribute('placeholder', 'gg/aa/yyyy');
});
