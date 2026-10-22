import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { browserTestEnv, phpBinary } from '../../playwright.config';

test.beforeEach(() => execFileSync(phpBinary, ['scripts/e2e-fixtures.php', 'setup'], { env: browserTestEnv, stdio: 'pipe' }));
test.afterAll(() => execFileSync(phpBinary, ['scripts/e2e-fixtures.php', 'cleanup'], { env: browserTestEnv, stdio: 'pipe' }));

async function login(page: Page, role = 'admin') {
  await page.goto('/deneme-sinavlari');
  await page.getByLabel('E-posta adresi', { exact: true }).fill(`e2e-${role}@example.test`);
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: role === 'admin' ? 'Deneme sınavları' : role === 'student' ? 'Bu panel için yetkiniz yok' : 'E-postanızı doğrulayın', exact: true })).toBeVisible();
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
  for (const name of ['Deneme Sınavı', 'Ders Sınavı']) {
    await page.getByLabel('Sınav türü adı', { exact: true }).fill(name);
    await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
    await expect(page.getByRole('status').filter({ hasText: 'Sınav türü oluşturuldu.' })).toBeVisible();
  }
  await page.getByRole('button', { name: /^Kaynaklar/ }).click();
  await page.getByLabel('Kaynak başlığı', { exact: true }).fill('Sentetik kaynak — resmî değildir');
  await page.getByLabel('Kaynak notu / referans', { exact: true }).fill('Yalnız tarayıcı testinde kullanılan sentetik içerik.');
  await page.getByRole('button', { name: 'Kaydı oluştur', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Kaynak oluşturuldu.' })).toBeVisible();
  await page.getByRole('link', { name: 'Deneme sınavları', exact: true }).click();
}

// A new question is written inside the exam it belongs to (there is no question bank to open).
async function writeQuestion(page: Page, stem = 'Sentetik E2E soru — resmî değildir') {
  await page.getByRole('button', { name: 'Yeni soru yaz', exact: true }).click();
  const card = page.getByLabel('Yeni soru', { exact: true });
  await card.getByLabel('Ders', { exact: true }).selectOption({ label: 'Sentetik E2E ders' });
  await card.getByLabel('Konu / alt konu', { exact: true }).selectOption({ label: 'Sentetik E2E konu' });
  await card.getByLabel('Kaynak', { exact: true }).selectOption({ label: 'Sentetik kaynak — resmî değildir' });
  await card.getByLabel('Soru metni', { exact: true }).fill(stem);
  await card.getByLabel('A seçeneği', { exact: true }).fill('Sentetik A');
  await card.getByLabel('B seçeneği', { exact: true }).fill('Sentetik B');
  await card.getByRole('radio', { name: 'A seçeneği doğru cevap', exact: true }).check();
  await card.getByLabel('Cevap açıklaması', { exact: true }).fill('Sentetik cevap açıklaması');
  await card.getByRole('button', { name: 'Soruyu kaydet ve sınava ekle', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Soru yazıldı ve yayımlandı; sınava eklendi.' })).toBeVisible();
}

// A draft Deneme Sınavı with one newly written question; returns the question id.
async function draftExam(page: Page) {
  await page.getByRole('link', { name: 'Yeni deneme sınavı', exact: true }).first().click();
  await page.getByLabel('Başlık', { exact: true }).fill('Sentetik E2E deneme sınavı');
  await page.getByLabel('Yıl', { exact: true }).fill('2024');
  await page.getByLabel('Sınav numarası', { exact: true }).fill('7');
  await writeQuestion(page);
  await page.getByRole('button', { name: 'Taslağı kaydet', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Sınav taslağı oluşturuldu.' })).toBeVisible();
  await expect(page).toHaveURL(/\/official-exams\/[0-9a-f-]+$/);
  await expect(page.locator('.question-card .question-stem')).toHaveText('Sentetik E2E soru — resmî değildir');
}

test('cookie giriş, katalog, sınavda soru yazma, düzeltme, yayın, geçmiş ve logout gerçek API ile çalışır', async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => consoleErrors.push(error.message));
  await login(page);
  // The admin panel mirrors the student app: Deneme and Ders sınavları, no question bank.
  await expect(page.getByRole('link', { name: 'Dersler', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Soru bankası' })).toHaveCount(0);
  await expect(page.getByText('Henüz deneme sınavı yok')).toBeVisible();
  await catalogs(page);
  await draftExam(page);
  const questionLink = page.locator('.question-card').getByRole('link', { name: 'Sürüm geçmişi' });
  const questionId = (await questionLink.getAttribute('href'))!.split('/').pop()!;
  // The card edits the question in place: new version, published, pinned to this exam.
  const card = page.locator('.question-card');
  await card.getByRole('button', { name: 'Düzenle', exact: true }).click();
  await card.getByLabel('Soru metni', { exact: true }).fill('İkinci sentetik E2E sürümü');
  await card.getByRole('radio', { name: 'B seçeneği doğru cevap', exact: true }).check();
  await card.getByRole('button', { name: 'Kaydet ve yayımla', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: '1. soru kaydedildi, yayımlandı ve sınavda güncellendi.' })).toBeVisible();
  await expect(card.locator('.question-stem')).toHaveText('İkinci sentetik E2E sürümü');
  await expect(card).toContainText('Sınavdaki sürüm 2');
  const publicBefore = await page.request.get(`http://127.0.0.1:8001/api/v1/questions/${questionId}`, { headers: { Origin: 'http://127.0.0.1:5184', Accept: 'application/json' } });
  expect(publicBefore.status()).toBe(200);
  expect((await publicBefore.json()).data.version).not.toHaveProperty('correct_option_id');
  expect((await publicBefore.json()).data.version.stem).toBe('İkinci sentetik E2E sürümü');
  // The exam is published once its questions are; students cannot see it before.
  await page.getByRole('button', { name: 'Yayımla', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Yayımla', exact: true }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Çıkmış sınav yayımlandı.' })).toBeVisible();
  mkdirSync('artifacts/admin-preview', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/admin-preview/editor.png', fullPage: true });
  // Version history of the question stays reachable from its card.
  await questionLink.click();
  await expect(page).toHaveURL(/\/questions\/[0-9a-f-]+$/);
  await page.getByRole('button', { name: 'Sürüm geçmişi' }).click();
  await page.getByRole('button', { name: /Sürüm 1/ }).click();
  await expect(page.getByRole('dialog')).toContainText('Sentetik E2E soru — resmî değildir');
  await expect(page.getByRole('dialog').locator('li.correct')).toContainText('Sentetik A');
  await page.getByRole('button', { name: 'Pencereyi kapat' }).click();
  await page.getByRole('link', { name: 'Sınavlara dön' }).click();
  await expect(page.getByRole('link', { name: 'ÖGG', exact: false }).or(page.getByRole('link', { name: /Sentetik E2E deneme sınavı/ }))).toBeVisible();
  await page.screenshot({ path: 'artifacts/admin-preview/exams.png', fullPage: true });
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  const afterLogout = await page.request.get('http://127.0.0.1:8001/api/v1/me', { headers: { Origin: 'http://127.0.0.1:5184', Accept: 'application/json' } });
  expect(afterLogout.status()).toBe(401);
  expect(consoleErrors).toEqual([]);
});

test('öğrenci ve doğrulanmamış yönetici paneli kullanamaz', async ({ page }) => {
  await login(page, 'student');
  await expect(page.getByRole('heading', { name: 'Bu panel için yetkiniz yok' })).toBeVisible();
  const response = await page.request.get('http://127.0.0.1:8001/api/v1/admin/official-exams', { headers: { Origin: 'http://127.0.0.1:5184', Accept: 'application/json' } });
  expect(response.status()).toBe(403);
  await page.getByRole('button', { name: 'Çıkış yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  await login(page, 'unverified');
  await expect(page.getByRole('heading', { name: 'E-postanızı doğrulayın' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Yeni deneme sınavı' })).toHaveCount(0);
});

test('yanlış giriş ve sunucu alan doğrulama hataları görünür', async ({ page }) => {
  await page.goto('/deneme-sinavlari');
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

// The question page keeps the unsaved-change guard and the 409 conflict flow; it is reached from a question card.
async function openQuestionPage(page: Page) {
  await login(page); await catalogs(page); await draftExam(page);
  await page.locator('.question-card').getByRole('link', { name: 'Sürüm geçmişi' }).click();
  await expect(page.getByRole('heading', { name: 'Soruyu düzenle' })).toBeVisible();
}

test('kaydedilmemiş içerik gezinirken korunur', async ({ page }) => {
  await openQuestionPage(page);
  await page.getByLabel('Soru metni', { exact: true }).fill('Kaydedilmemiş değişiklik');
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Kaydedilmemiş değişiklikler var' })).toBeVisible();
  await page.getByRole('button', { name: 'Düzenlemeye devam et' }).click();
  await expect(page.getByLabel('Soru metni', { exact: true })).toHaveValue('Kaydedilmemiş değişiklik');
  await page.getByRole('link', { name: 'Kataloglar', exact: true }).click();
  await page.getByRole('button', { name: 'Kaydetmeden ayrıl' }).click();
  await expect(page.getByRole('heading', { name: 'Kataloglar', exact: true })).toBeVisible();
});

test('409 çakışmasında yerel taslak silinmez ve sunucudan yükleme onay ister', async ({ page }) => {
  await openQuestionPage(page);
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
  await login(page); await catalogs(page);
  await page.getByRole('link', { name: 'Yeni deneme sınavı', exact: true }).first().click();
  await page.getByRole('button', { name: 'Yeni soru yaz', exact: true }).click();
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByLabel('Yeni soru', { exact: true }).getByLabel('Soru metni', { exact: true })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
  mkdirSync('artifacts/admin-preview', { recursive: true });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'artifacts/admin-preview/mobile-editor.png', fullPage: true });
  for (const [width, link] of [[834, 'Ders sınavları'], [390, 'Deneme sınavları']] as const) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('link', { name: link, exact: true }).click();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test('API bağlantı hatası ve yeniden deneme akışı görünür', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Deneme sınavları', exact: true })).toBeVisible();
  await page.route('**/api/v1/admin/official-exams?*', (route) => route.abort('internetdisconnected'));
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await page.unroute('**/api/v1/admin/official-exams?*');
  await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
  await expect(page.getByText('Henüz deneme sınavı yok')).toBeVisible();
});

test('korumalı API oturumu sona erdiğinde panel giriş ekranına döner', async ({ page }) => {
  await login(page);
  await expect(page.getByRole('heading', { name: 'Deneme sınavları', exact: true })).toBeVisible();
  await page.route('**/api/v1/admin/official-exams?*', (route) => route.fulfill({ status: 401, contentType: 'application/problem+json', body: JSON.stringify({ code: 'unauthenticated', detail: 'Oturum sona erdi.' }) }));
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Tekrar hoş geldiniz' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Yeni deneme sınavı' })).toHaveCount(0);
});
