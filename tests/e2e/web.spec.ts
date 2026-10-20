import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { answer, enterDeneme, enterDers, finish, fixture, login, openFromReview } from './student';

test.use({ baseURL: 'http://127.0.0.1:5183' });
test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); });
test.afterAll(() => fixture('cleanup'));

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
  await page.getByLabel('Parola tekrar').fill('Synthetic-Browser-42!');
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
  await page.getByLabel('Parola tekrar').fill('Synthetic-New-Password-42!');
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

test('tekrar listesinden çözülen soruda kaybolan yanıt tek sonuç bırakır', async ({ page }) => {
  fixture('favorite');
  await login(page); await openFromReview(page);
  let lost = false;
  await page.route('**/practice-attempts/*/answer', async (route) => {
    if (!lost) { lost = true; await route.fetch(); await route.abort('internetdisconnected'); }
    else await route.continue();
  });
  await page.getByRole('radio', { name: /Sentetik A/ }).check();
  await page.getByRole('button', { name: 'Cevabımı kontrol et' }).click();
  await expect(page.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await expect(page.getByRole('radio', { name: /Sentetik B/ })).toBeDisabled();
  await page.getByRole('button', { name: 'Yeniden dene' }).click();
  await expect(page.getByRole('status')).toContainText('Doğru');
  await expect(page.getByLabel('Çıkmış sınavlar')).toContainText('1. Deneme · silahlı');
  await expect(page.getByLabel('Çıkmış sınavlar')).toContainText('1. Ders · Sentetik çalışma dersi');
});

test('iki sekmede farklı cevap gönderilirse ilk sonuç korunur ve ikinci sekme yenilenir', async ({ page }) => {
  fixture('favorite');
  await login(page); await openFromReview(page);
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByRole('heading', { name: 'Bir soru, bir adım' })).toBeVisible();
  await page.getByRole('radio', { name: /Sentetik A/ }).check();
  await page.getByRole('button', { name: 'Cevabımı kontrol et' }).click();
  await expect(page.getByRole('status')).toContainText('Doğru');
  await other.getByRole('radio', { name: /Sentetik B/ }).check();
  await other.getByRole('button', { name: 'Cevabımı kontrol et' }).click();
  await expect(other.getByRole('alert')).toContainText('Bu çözüm tamamlandı.');
  await other.getByRole('button', { name: 'Kaydı yenile' }).click();
  await expect(other.getByRole('status')).toContainText('Doğru');
  await other.close();
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
