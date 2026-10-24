import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { answer, enterDeneme, enterDers, enterReview, finish, fixture, login } from './student';

test.use({ baseURL: 'http://127.0.0.1:5183' });
test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); });
test.afterAll(() => fixture('cleanup'));

test('web giriş formu açık/koyu ve dar/geniş ekrana sığar; parola görünürlüğü ekran değişiminde sıfırlanır', async ({ page }) => {
  mkdirSync('artifacts/web-preview/redesign', { recursive: true });
  await page.goto('/');
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    for (const width of [320, 390, 834, 1280]) {
      await page.setViewportSize({ width, height: 844 });
      await expect(page.getByRole('heading', { name: 'Hoş geldin' })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole('button', { name: 'Giriş yap', exact: true })).toBeInViewport();
      await page.screenshot({ path: `artifacts/web-preview/redesign/login-${colorScheme}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  const password = page.getByLabel('Parola', { exact: true });
  await password.fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Parola: parolayı göster', exact: true }).click();
  await expect(password).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(password).toHaveValue('');
  await expect(password).toHaveAttribute('type', 'password');
  await expect(password).toHaveAttribute('autocomplete', 'new-password');
  await page.getByRole('button', { name: 'Girişe dön', exact: true }).click();
  await page.getByRole('button', { name: 'Parolamı unuttum' }).click();
  await expect(page.getByRole('heading', { name: 'Parolanı yenile' })).toBeVisible();
  await expect(page.getByRole('button', { name: /parolayı göster/ })).toHaveCount(0);
});

test('giriş beklerken parola ve mod kontrolleri kilitlenir; tek erişim alanında seçici görünmez', async ({ page }) => {
  fixture('setup');
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  await page.route('**/api/v1/auth/login', async (route) => { await gate; await route.continue(); });
  await page.goto('/');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  try {
    await expect(page.getByLabel('Parola', { exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Parola: parolayı göster', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Parolamı unuttum' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Hesap oluştur', exact: true })).toBeDisabled();
  } finally { release(); }
  await expect(page.getByRole('heading', { name: 'Deneme sınavları', exact: true })).toBeVisible();
  await expect(page.getByLabel('Çalışma alanı', { exact: true })).toHaveCount(0);
  await expect(page.locator('.site-header')).toContainText('ÖGG Soru Cevap Platformu');
});

test('öğrenci deneme sınavına girer; cevaplar, sonuç ve geçmiş kalır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  // Only the two kinds of exam exist in the app: there is no question bank to browse.
  await expect(page.getByRole('link', { name: 'Soru çöz' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Çalışma geçmişim' })).toHaveCount(0);
  const row = page.locator('.sinav-row').filter({ hasText: '1. Deneme Sınavı' });
  await expect(row).toContainText('3 soru');
  await expect(row).toContainText('önerilen süre 150 dk');
  await expect(row).toContainText('Henüz girmedin');
  mkdirSync('artifacts/web-preview', { recursive: true });
  await page.screenshot({ path: 'artifacts/web-preview/deneme.png', fullPage: true });
  // The fixture exam is an armed exam; the unarmed list is empty.
  await page.getByRole('button', { name: 'Silahsız sınav' }).click();
  await expect(page.getByRole('heading', { name: 'Henüz deneme sınavı yok' })).toBeVisible();
  await page.getByRole('button', { name: 'Silahlı sınav' }).click();
  await row.getByRole('button', { name: 'Sınava gir', exact: true }).click();
  await expect(row.getByLabel('Süre (dakika)', { exact: true })).toHaveValue('150');
  await row.getByLabel('Süre (dakika)', { exact: true }).fill('5');
  await row.getByRole('button', { name: 'Sınavı başlat' }).click();
  await expect(page.getByRole('heading', { name: 'Denemen devam ediyor' })).toBeVisible();
  await answer(page, 'A');
  await page.getByRole('button', { name: 'Sonraki soru' }).click();
  await answer(page, 'B');
  await finish(page);
  await expect(page.getByRole('status').filter({ hasText: 'DOĞRU YÜZDESİ' })).toContainText('1 doğru · 1 yanlış · 1 boş');
  await page.screenshot({ path: 'artifacts/web-preview/result.png', fullPage: true });
  await page.getByRole('link', { name: 'Sonuçlarıma dön' }).click();
  await expect(page.getByRole('region', { name: 'Sınav sonuçları' }).getByRole('link')).toHaveCount(1);
  await page.screenshot({ path: 'artifacts/web-preview/history.png', fullPage: true });
  await page.getByRole('button', { name: 'Çıkış yap' }).click();
  await expect(page.getByRole('heading', { name: 'Hoş geldin' })).toBeVisible();
  await login(page);
  await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sınav sonuçları' }).getByRole('link')).toHaveCount(1);
  await page.getByRole('link', { name: 'Deneme sınavları', exact: true }).click();
  await expect(page.locator('.sinav-row').filter({ hasText: '1. Deneme Sınavı' })).toContainText('1 kez tamamlandı');
  expect(errors).toEqual([]);
});

test('ders sınavı dersine göre bulunur ve çözülür', async ({ page }) => {
  await login(page);
  await page.getByRole('link', { name: 'Ders sınavları', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Sentetik çalışma dersi/ })).toHaveAttribute('aria-pressed', 'true');
  const row = page.locator('.sinav-row').filter({ hasText: '1. Ders Sınavı' });
  await expect(row).toContainText('3 soru');
  // Subject exams have no official duration: the suggestion is 1.2 minutes per question, at least five minutes.
  await expect(row).toContainText('önerilen süre 5 dk');
  await enterDers(page);
  await answer(page, 'A');
  await page.getByRole('button', { name: 'Sonraki soru' }).click();
  await answer(page, 'A');
  await page.getByRole('button', { name: 'Sonraki soru' }).click();
  await answer(page, 'A');
  await finish(page);
  await expect(page.getByRole('status').filter({ hasText: 'DOĞRU YÜZDESİ' })).toContainText('3 doğru · 0 yanlış · 0 boş');
  await page.getByRole('link', { name: 'Ders sınavları', exact: true }).click();
  await expect(page.locator('.sinav-row').filter({ hasText: '1. Ders Sınavı' })).toContainText('en iyi %100');
});

test('yarım kalan sınav sürdürülür; kişisel ve kurum sonuçları ayrıdır', async ({ page }) => {
  await login(page); await enterDeneme(page);
  const examUrl = page.url();
  await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
  await page.getByRole('link').filter({ hasText: 'Devam et' }).click();
  await expect(page).toHaveURL(examUrl);
  await expect(page.getByRole('heading', { name: 'Denemen devam ediyor' })).toBeVisible();
  await page.getByRole('link', { name: 'Deneme sınavları', exact: true }).click();
  await expect(page.locator('.sinav-row').filter({ hasText: '1. Deneme Sınavı' }).getByRole('link', { name: 'Devam et' })).toBeVisible();
  await page.getByLabel('Çalışma alanı').selectOption({ label: 'Sentetik eğitim kurumu' });
  await expect(page.getByRole('heading', { name: 'Deneme sınavları' })).toBeVisible();
  await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Henüz bir sınava girmedin' })).toBeVisible();
  await page.getByLabel('Çalışma alanı').selectOption({ label: 'Kişisel çalışma' });
  await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
  await expect(page.getByRole('link').filter({ hasText: 'Devam et' })).toHaveCount(1);
});

test('bireysel kayıt, giriş ve imzalı e-posta doğrulama öğrenci ekranından çalışır', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await page.getByLabel('Ad soyad').fill('Sentetik yeni öğrenci');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-new@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByLabel('Parola tekrar', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Hesap oluştur', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Hesabınız oluşturuldu.');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E-postanı doğrula' })).toBeVisible();
  await page.goto(fixture('verification-link', 'e2e-new@example.test'));
  await page.getByRole('button', { name: 'E-postamı doğrula', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'E-postan doğrulandı' })).toBeVisible();
  await page.getByRole('link', { name: 'Çalışmaya başla' }).click();
  await expect(page.getByRole('heading', { name: 'Deneme sınavları' })).toBeVisible();
});

test('parola sıfırlama formu gerçek token ile yeni giriş sağlar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Parolamı unuttum' }).click();
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByRole('button', { name: 'Bağlantı gönder' }).click();
  await expect(page.getByRole('status')).toContainText('Hesap mevcutsa');
  // The local fixture issues a real Laravel broker token and uses the mail notification's URL.
  await page.goto(fixture('reset-link', 'e2e-student@example.test'));
  await page.getByLabel('Yeni parola', { exact: true }).fill('Synthetic-New-Password-42!');
  await page.getByLabel('Parola tekrar', { exact: true }).fill('Synthetic-New-Password-42!');
  await page.getByRole('button', { name: 'Parolayı yenile' }).click();
  await expect(page.getByRole('heading', { name: 'Parolan yenilendi' })).toBeVisible();
  await page.getByRole('link', { name: 'Girişe dön' }).click();
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-New-Password-42!');
  await page.getByRole('button', { name: 'Giriş yap' }).click();
  await expect(page.getByRole('heading', { name: 'Deneme sınavları' })).toBeVisible();
});

test('sınav yokken öğrenciye boş durum gösterilir', async ({ page }) => {
  fixture('setup');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Henüz deneme sınavı yok' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Sınava gir' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Ders sınavları', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Henüz ders sınavı yok' })).toBeVisible();
});

test('başlatma yanıtı kaybolduğunda aynı işlem kimliğiyle tekrar edilir', async ({ page }) => {
  await login(page);
  const ids: string[] = [];
  await page.route('**/contexts/*/exam-attempts', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    ids.push(route.request().postDataJSON().id);
    if (ids.length === 1) { await route.fetch(); await route.abort('internetdisconnected'); }
    else await route.continue();
  });
  const row = page.locator('.sinav-row').filter({ hasText: '1. Deneme Sınavı' });
  await row.getByRole('button', { name: 'Sınava gir', exact: true }).click();
  await row.getByLabel('Süre (dakika)', { exact: true }).fill('5');
  await row.getByRole('button', { name: 'Sınavı başlat' }).click();
  await expect(row.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await row.getByRole('button', { name: 'Yeniden dene' }).click();
  await expect(page.getByRole('heading', { name: 'Denemen devam ediyor' })).toBeVisible();
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
  await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Sınav sonuçları' }).getByRole('link')).toHaveCount(1);
});

test('tekrar sınavı hatalardan kurulur ve sonuçla listeleri günceller', async ({ page }) => {
  await login(page);
  // The Ders Sınavı leaves one wrong, one blank and one correct answer behind.
  await enterDers(page);
  await answer(page, 'B');
  await page.getByRole('button', { name: 'Sonraki soru' }).click();
  await page.getByRole('button', { name: 'Sonraki soru' }).click();
  await answer(page, 'A');
  await finish(page);
  await page.getByRole('link', { name: 'Tekrar sınavı', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tekrar sınavı' })).toBeVisible();
  await expect(page.locator('.sinav-row').filter({ hasText: 'Yanlışlarım' })).toContainText('1 soru');
  await expect(page.locator('.sinav-row').filter({ hasText: 'Boş bıraktıklarım' })).toContainText('1 soru');
  await expect(page.locator('.sinav-row').filter({ hasText: 'Favorilerim' })).toContainText('Henüz favori soru eklemedin.');
  await expect(page.locator('.sinav-row').filter({ hasText: 'Favorilerim' }).getByRole('button', { name: 'Tekrar sınavına gir' })).toBeDisabled();
  // No question list to browse or solve one by one.
  await expect(page.getByRole('button', { name: 'Soruyu çöz' })).toHaveCount(0);
  // Timestamps have second precision; the corrected answer must come in a later second to be the latest one.
  await page.waitForTimeout(1100);
  await enterReview(page, 'Yanlışlarım');
  await expect(page.getByRole('heading', { name: 'Sentetik birinci soru' })).toBeVisible();
  await answer(page, 'A');
  await finish(page);
  await page.getByRole('link', { name: 'Tekrar sınavı', exact: true }).click();
  await expect(page.locator('.sinav-row').filter({ hasText: 'Yanlışlarım' })).toContainText('Şu an tekrar edeceğin yanlış soru yok.');
});

test('tekrar sınavı başlatma yanıtı kaybolsa aynı işlem kimliğiyle tekrar edilir', async ({ page }) => {
  fixture('favorite');
  await login(page);
  const ids: string[] = [];
  await page.route('**/contexts/*/exam-attempts', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    const body = route.request().postDataJSON();
    expect(body.review_kind).toBe('favorite');
    ids.push(body.id);
    if (ids.length === 1) { await route.fetch(); await route.abort('internetdisconnected'); }
    else await route.continue();
  });
  await page.getByRole('link', { name: 'Tekrar sınavı', exact: true }).click();
  const card = page.locator('.sinav-row').filter({ has: page.getByRole('heading', { name: 'Favorilerim', exact: true }) });
  await expect(card).toContainText('3 soru');
  await card.getByRole('button', { name: 'Tekrar sınavına gir' }).click();
  await card.getByLabel('Soru sayısı', { exact: true }).fill('2');
  await card.getByRole('button', { name: 'Sınavı başlat' }).click();
  await expect(card.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await card.getByRole('button', { name: 'Yeniden dene' }).click();
  await expect(page.getByRole('heading', { name: 'Denemen devam ediyor' })).toBeVisible();
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
  await expect(page.getByText('Soru 1 / 2', { exact: false })).toBeVisible();
});

test('telefon ve tablette sınav listeleri ve sınav ekranı taşmaz', async ({ page }) => {
  fixture('favorite');
  await login(page);
  const fits = async () => expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.getByRole('link', { name: 'Deneme sınavları', exact: true }).click();
    await expect(page.locator('.sinav-row').first()).toBeVisible(); await fits();
    await page.getByRole('link', { name: 'Ders sınavları', exact: true }).click();
    await expect(page.locator('.sinav-row').first()).toBeVisible(); await fits();
  }
  await enterDers(page);
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('radio', { name: /Sentetik A/ })).toBeVisible(); await fits();
  }
  mkdirSync('artifacts/web-preview', { recursive: true });
  await page.screenshot({ path: 'artifacts/web-preview/mobile-exam.png', fullPage: true });
});
