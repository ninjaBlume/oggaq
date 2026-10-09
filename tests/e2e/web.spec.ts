import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { browserTestEnv, phpBinary } from '../../playwright.config';

test.use({ baseURL: 'http://127.0.0.1:5183' });
function fixture(operation: string, email?: string) {
  return execFileSync(phpBinary, ['scripts/e2e-fixtures.php', operation, ...(email ? [email] : [])], { env: browserTestEnv, encoding: 'utf8', stdio: 'pipe' }).trim();
}
test.beforeEach(() => fixture('setup-study'));
test.afterAll(() => fixture('cleanup'));
async function login(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bugün ne çalışalım?' })).toBeVisible();
}
async function openQuestion(page: Page, name = 'Sentetik birinci soru') {
  await page.locator('article').filter({ has: page.getByRole('heading', { name, exact: true }) }).getByRole('button', { name: 'Soruyu çöz' }).click();
  await expect(page.getByRole('heading', { name: 'Bir soru, bir adım' })).toBeVisible();
}
async function back(page: Page) {
  await page.getByRole('link', { name: 'Sorulara dön', exact: false }).click();
  await expect(page.getByRole('heading', { name: 'Bugün ne çalışalım?' })).toBeVisible();
}

test('öğrenci doğru, yanlış ve boş cevapları gerçek API ile çözer; geçmiş kalır', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await login(page);
  await page.getByLabel('Ders', { exact: true }).selectOption({ label: 'Sentetik çalışma dersi' });
  await page.getByLabel('Konu / alt konu').selectOption({ label: 'Sentetik konu' });
  await expect(page.getByRole('heading', { name: 'Sentetik birinci soru', exact: true })).toBeVisible();
  mkdirSync('artifacts/web-preview', { recursive: true });
  await page.screenshot({ path: 'artifacts/web-preview/questions.png', fullPage: true });
  await openQuestion(page);
  await expect(page.getByText('Sentetik açıklama', { exact: false })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Sentetik birinci soru' })).toBeVisible();
  await page.getByRole('radio', { name: /Sentetik A/ }).check();
  await page.getByRole('button', { name: 'Cevabımı kontrol et' }).click();
  await expect(page.getByRole('status')).toContainText('Doğru');
  await expect(page.getByText('Sentetik açıklama — gerçek sınav içeriği değildir.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Çözümünü incele' })).toBeVisible();
  await page.screenshot({ path: 'artifacts/web-preview/result.png', fullPage: true });
  await back(page); await openQuestion(page, 'Sentetik ikinci soru');
  await page.getByRole('radio', { name: /Sentetik B/ }).check();
  await page.getByRole('button', { name: 'Cevabımı kontrol et' }).click();
  await expect(page.getByRole('status')).toContainText('Yanlış');
  await back(page); await openQuestion(page, 'Sentetik üçüncü soru');
  await page.getByRole('button', { name: 'Boş bırak', exact: true }).click();
  await page.getByRole('button', { name: 'Boş olarak kaydet' }).click();
  await expect(page.getByRole('status')).toContainText('Boş bırakıldı');
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Çözüm geçmişi' }).getByRole('link')).toHaveCount(3);
  await page.screenshot({ path: 'artifacts/web-preview/history.png', fullPage: true });
  await page.getByRole('button', { name: 'Çıkış yap' }).click();
  await expect(page.getByRole('heading', { name: 'Hoş geldin' })).toBeVisible();
  await login(page);
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Çözüm geçmişi' }).getByRole('link')).toHaveCount(3);
  expect(errors).toEqual([]);
});

test('yarım çalışma sürdürülür; kişisel ve kurum geçmişleri ayrıdır', async ({ page }) => {
  await login(page); await openQuestion(page);
  const personalUrl = page.url();
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await page.getByRole('link').filter({ hasText: 'Devam ediyor' }).click();
  await expect(page).toHaveURL(personalUrl);
  await expect(page.getByRole('heading', { name: 'Bir soru, bir adım' })).toBeVisible();
  await page.getByLabel('Çalışma alanı').selectOption({ label: 'Sentetik eğitim kurumu' });
  await expect(page.getByRole('heading', { name: 'Bugün ne çalışalım?' })).toBeVisible();
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'İlk çalışmana hazır mısın?' })).toBeVisible();
  await page.getByLabel('Çalışma alanı').selectOption({ label: 'Kişisel çalışma' });
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('link').filter({ hasText: 'Devam ediyor' })).toHaveCount(1);
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
  await expect(page.getByRole('heading', { name: 'Bugün ne çalışalım?' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Bugün ne çalışalım?' })).toBeVisible();
});

test('sunucu cevabı kaydettikten sonra yanıt kaybolsa da tekrar tek sonucu getirir', async ({ page }) => {
  await login(page); await openQuestion(page);
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
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Çözüm geçmişi' }).getByRole('link')).toHaveCount(1);
});

test('telefon ve tablette soru çözme düzeni taşmaz', async ({ page }) => {
  await login(page); await openQuestion(page);
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole('radio', { name: /Sentetik A/ })).toBeVisible();
    const dimensions = await page.evaluate(() => ({ viewport: window.innerWidth, content: document.documentElement.scrollWidth }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
  mkdirSync('artifacts/web-preview', { recursive: true });
  await page.screenshot({ path: 'artifacts/web-preview/mobile-practice.png', fullPage: true });
});

test('gerçek soru bankası boşken öğrenciye boş durum gösterilir', async ({ page }) => {
  fixture('setup');
  await login(page);
  await expect(page.getByRole('heading', { name: 'Henüz yayımlanmış soru yok' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Soruyu çöz' })).toHaveCount(0);
});


test('çalışma açma yanıtı kaybolduğunda aynı işlem kimliğiyle tekrar edilir', async ({ page }) => {
  await login(page);
  const ids: string[] = [];
  await page.route('**/contexts/*/practice-attempts', async (route) => {
    if (route.request().method() !== 'POST') { await route.continue(); return; }
    ids.push(route.request().postDataJSON().id);
    if (ids.length === 1) { await route.fetch(); await route.abort('internetdisconnected'); }
    else await route.continue();
  });
  const card = page.locator('article').filter({ has: page.getByRole('heading', { name: 'Sentetik birinci soru', exact: true }) });
  await card.getByRole('button', { name: 'Soruyu çöz' }).click();
  await expect(card.getByRole('alert')).toContainText('Sunucuya ulaşılamıyor.');
  await card.getByRole('button', { name: 'Yeniden dene' }).click();
  await expect(page.getByRole('heading', { name: 'Bir soru, bir adım' })).toBeVisible();
  expect(ids).toHaveLength(2); expect(ids[0]).toBe(ids[1]);
  await page.getByRole('link', { name: 'Çalışma geçmişim', exact: true }).click();
  await expect(page.getByRole('region', { name: 'Çözüm geçmişi' }).getByRole('link')).toHaveCount(1);
});

test('iki sekmede farklı cevap gönderilirse ilk sonuç korunur ve ikinci sekme yenilenir', async ({ page }) => {
  await login(page); await openQuestion(page);
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
