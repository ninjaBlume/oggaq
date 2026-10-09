import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { browserTestEnv, phpBinary } from '../../playwright.config';

test.beforeEach(() => execFileSync(phpBinary, ['scripts/e2e-fixtures.php', 'setup'], { env: browserTestEnv, stdio: 'pipe' }));
test.afterAll(() => execFileSync(phpBinary, ['scripts/e2e-fixtures.php', 'cleanup'], { env: browserTestEnv, stdio: 'pipe' }));

async function login(page: Page, role = 'admin') {
  await page.goto('/questions');
  await page.getByLabel('E-posta adresi', { exact: true }).fill(`e2e-${role}@example.test`);
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: role === 'admin' ? 'Soru bankası' : role === 'student' ? 'Bu panel için yetkiniz yok' : 'E-postanızı doğrulayın', exact: true })).toBeVisible();
}

async function catalogs(page: Page) {
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await page.getByLabel('Ders adı', { exact: true }).fill('Sentetik E2E ders');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ders oluşturuldu.' })).toBeVisible();
  await page.getByRole('button', { name: /^Konular/ }).click();
  await page.getByLabel('Ders', { exact: true }).selectOption({ label: 'Sentetik E2E ders' });
  await page.getByLabel('Konu adı', { exact: true }).fill('Sentetik E2E konu');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Konu oluşturuldu.' })).toBeVisible();
  await page.getByRole('button', { name: /^Sınav türleri/ }).click();
  await page.getByLabel('Sınav türü adı', { exact: true }).fill('Sentetik E2E tür');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sınav türü oluşturuldu.' })).toBeVisible();
  await page.getByRole('button', { name: /^Kaynaklar/ }).click();
  await page.getByLabel('Kaynak başlığı', { exact: true }).fill('Sentetik kaynak — resmî değildir');
  await page.getByLabel('Kaynak notu / referans', { exact: true }).fill('Yalnız tarayıcı testinde kullanılan sentetik içerik.');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Kaynak oluşturuldu.' })).toBeVisible();
  await page.getByRole('link', { name: 'Soru bankası', exact: true }).click();
}

async function fillQuestion(page: Page, stem = 'Sentetik E2E soru — resmî değildir') {
  await page.getByRole('link', { name: 'Yeni soru', exact: true }).click();
  await page.getByLabel('Ders', { exact: true }).selectOption({ label: 'Sentetik E2E ders' });
  await page.getByLabel('Konu / alt konu', { exact: true }).selectOption({ label: 'Sentetik E2E konu' });
  await page.getByLabel('Sınav türü', { exact: true }).selectOption({ label: 'Sentetik E2E tür' });
  await page.getByLabel('Kaynak', { exact: true }).selectOption({ label: 'Sentetik kaynak — resmî değildir' });
  await page.getByLabel('Soru metni', { exact: true }).fill(stem);
  await page.getByLabel('A seçeneği', { exact: true }).fill('Sentetik A');
  await page.getByLabel('B seçeneği', { exact: true }).fill('Sentetik B');
  await page.getByRole('radio', { name: 'A seçeneği doğru cevap', exact: true }).check();
  await page.getByLabel('Açıklama', { exact: true }).fill('Sentetik cevap açıklaması');
}

test('cookie giriş, katalog, taslak, sürüm, yayın, geçmiş ve logout gerçek API ile çalışır', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await login(page);
  await expect(page.getByRole('heading', { name: 'Soru bankası', exact: true })).toBeVisible();
  await expect(page.getByText('Soru bankanız hazır, ilk soruyu ekleyin')).toBeVisible();
  await catalogs(page);
  await fillQuestion(page);
  await page.getByRole('button', { name: 'Önizle', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Sentetik E2E soru');
  await expect(page.getByRole('dialog')).toContainText('Doğru cevap');
  await page.getByRole('button', { name: 'Pencereyi kapat' }).click();
  await page.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(page).toHaveURL(/\/questions\/[0-9a-f-]+$/);
  await expect(page.getByRole('heading', { name: 'Soruyu düzenle' })).toBeVisible();
  const questionId = new URL(page.url()).pathname.split('/').pop()!;
  await page.reload();
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Sentetik E2E soru — resmî değildir');
  await page.getByRole('button', { name: 'Yayımla', exact: true }).click();
  await page.getByRole('button', { name: 'Son sürümü yayımla', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Soru yayımlandı.' })).toBeVisible();
  const publicBefore = await page.request.get(`http://127.0.0.1:8001/api/v1/questions/${questionId}`, { headers: { Origin: 'http://127.0.0.1:5174', Accept: 'application/json' } });
  expect(publicBefore.status()).toBe(200);
  expect((await publicBefore.json()).data.version).not.toHaveProperty('correct_option_id');
  await page.getByLabel('Soru metni', { exact: true }).fill('İkinci sentetik E2E sürümü');
  await page.getByRole('radio', { name: 'B seçeneği doğru cevap', exact: true }).check();
  await page.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Yeni taslak sürümü kaydedildi.' })).toBeVisible();
  const stillOld = await page.request.get(`http://127.0.0.1:8001/api/v1/questions/${questionId}`, { headers: { Origin: 'http://127.0.0.1:5174', Accept: 'application/json' } });
  expect((await stillOld.json()).data.version.stem).toBe('Sentetik E2E soru — resmî değildir');
  await page.getByRole('button', { name: 'Yayımla', exact: true }).click();
  await page.getByRole('button', { name: 'Son sürümü yayımla', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Soru yayımlandı.' })).toBeVisible();
  await page.getByRole('button', { name: 'Sürüm geçmişi' }).click();
  await page.getByRole('button', { name: /Sürüm 1/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Sentetik E2E soru — resmî değildir');
  await expect(page.getByRole('dialog').locator('li.correct')).toContainText('Sentetik A');
  await page.getByRole('button', { name: 'Pencereyi kapat' }).click();
  mkdirSync('artifacts/admin-preview', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/admin-preview/editor.png', fullPage: true });
  await page.getByRole('link', { name: 'Soru bankasına dön' }).click();
  await expect(page.getByRole('link', { name: 'İkinci sentetik E2E sürümü', exact: true })).toBeVisible();
  await page.screenshot({ path: 'artifacts/admin-preview/questions.png', fullPage: true });
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  const afterLogout = await page.request.get('http://127.0.0.1:8001/api/v1/me', { headers: { Origin: 'http://127.0.0.1:5174', Accept: 'application/json' } });
  expect(afterLogout.status()).toBe(401);
  expect(consoleErrors).toEqual([]);
});

test('öğrenci ve doğrulanmamış yönetici paneli kullanamaz', async ({ page }) => {
  await login(page, 'student');
  await expect(page.getByRole('heading', { name: 'Bu panel için yetkiniz yok' })).toBeVisible();
  const response = await page.request.get('http://127.0.0.1:8001/api/v1/admin/questions', { headers: { Origin: 'http://127.0.0.1:5174', Accept: 'application/json' } });
  expect(response.status()).toBe(403);
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  await login(page, 'unverified');
  await expect(page.getByRole('heading', { name: 'E-postanızı doğrulayın' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Yeni soru' })).toHaveCount(0);
});

test('yanlış giriş ve sunucu alan doğrulama hataları görünür', async ({ page }) => {
  await page.goto('/questions');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-admin@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Wrong-Password-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('E-posta adresi veya parola hatalı.');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await page.getByLabel('Ders adı', { exact: true }).fill('Sentetik ders');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Ders oluşturuldu.' })).toBeVisible();
  await page.getByLabel('Ders adı', { exact: true }).fill('Sentetik ders');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByLabel('Kısa kod', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByRole('alert')).toBeVisible();
});

test('kaydedilmemiş içerik gezinirken korunur', async ({ page }) => {
  await login(page); await catalogs(page); await fillQuestion(page);
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Kaydedilmemiş değişiklikler var' })).toBeVisible();
  await page.getByRole('button', { name: 'Düzenlemeye devam et' }).click();
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Sentetik E2E soru — resmî değildir');
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await page.getByRole('button', { name: 'Kaydetmeden ayrıl' }).click();
  await expect(page.getByRole('heading', { name: 'Kataloglar', exact: true })).toBeVisible();
});

test('409 çakışmasında yerel taslak silinmez ve sunucudan yükleme onay ister', async ({ page }) => {
  await login(page); await catalogs(page); await fillQuestion(page);
  await page.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Soruyu düzenle' })).toBeVisible();
  const other = await page.context().newPage();
  await other.goto(page.url());
  await other.getByLabel('Soru metni', { exact: true }).fill('Başka sekmede kaydedilen sürüm');
  await other.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(other.getByRole('status').filter({ hasText: 'Yeni taslak sürümü kaydedildi.' })).toBeVisible();
  await other.close();
  await page.getByLabel('Soru metni', { exact: true }).fill('Yerel değişiklik korunacak');
  await page.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('Soru başka bir işlemde güncellendi.');
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Yerel değişiklik korunacak');
  await page.getByRole('button', { name: 'Sunucudaki sürümü yükle' }).click();
  await page.getByRole('button', { name: 'Değişikliklerimi koru' }).click();
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Yerel değişiklik korunacak');
  await page.getByRole('button', { name: 'Sunucudaki sürümü yükle' }).click();
  await page.getByRole('button', { name: 'Son sürümü yükle', exact: true }).click();
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Başka sekmede kaydedilen sürüm');
});

test('tablet ve telefon düzeni ekranı yatay taşırmaz', async ({ page }) => {
  await login(page); await catalogs(page); await fillQuestion(page);
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByLabel('Soru metni', { exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
  mkdirSync('artifacts/admin-preview', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/admin-preview/mobile-editor.png', fullPage: true });
});

test('API bağlantı hatası ve yeniden deneme akışı görünür', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Soru bankası', exact: true })).toBeVisible();
  await page.route('**/api/v1/admin/questions?*', (route) => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await page.unroute('**/api/v1/admin/questions?*');
  await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
  await expect(page.getByText('Soru bankanız hazır, ilk soruyu ekleyin')).toBeVisible();
});

test('korumalı API oturumu sona erdiğinde panel giriş ekranına döner', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Soru bankası', exact: true })).toBeVisible();
  await page.route('**/api/v1/admin/questions?*', (route) => route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'unauthenticated', detail: 'Oturum sona erdi.' }) }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Yeni soru' })).toHaveCount(0);
});
