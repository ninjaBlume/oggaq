import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture, login } from './student';
const admin = 'http://127.0.0.1:5184';
test.use({ baseURL: 'http://127.0.0.1:5183' });
test.beforeEach(() => { fixture('setup-study'); });
test.afterAll(() => { fixture('cleanup'); });
async function adminLogin(page: Page) {
  await page.goto(`${admin}/deneme-sinavlari`); await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-admin@example.test'); await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!'); await page.getByRole('button', { name: 'Giriş yap', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Deneme sınavları', exact: true })).toBeVisible();
}
async function publishPair(page: Page, id: string) {
  await page.goto(`${admin}/official-exams/${id}`);
  await expect(page.getByLabel('Silahlı ve silahsız seçenekleri birlikte oluştur')).toBeChecked(); await expect(page.getByLabel('Silah durumu', { exact: true })).toHaveCount(0);
  await expect(page.locator('#soru-100')).toContainText('Silahlı / Silahsız ortak'); await expect(page.locator('#soru-101')).toContainText('Yalnız silahlı');
  await page.getByRole('button', { name: 'Yayımla', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Yayımla', exact: true }).click(); await expect(page.getByRole('status').filter({ hasText: 'Silahlı ve silahsız seçenekler birlikte yayımlandı.' })).toBeVisible();
}

test('admin tek girişten iki seçenek yayımlar; webde 100/125 soru ve ortak düzeltme doğru seçeneklere gider', async ({ browser, page }) => {
  test.setTimeout(90_000); const managerContext = await browser.newContext(); const manager = await managerContext.newPage();
  try {
    await adminLogin(manager); await manager.getByRole('link', { name: 'Yeni deneme sınavı', exact: true }).first().click();
    await expect(manager.getByLabel('Silahlı ve silahsız seçenekleri birlikte oluştur')).toBeChecked(); await expect(manager.getByLabel('Silah durumu', { exact: true })).toHaveCount(0);
    await manager.getByLabel('Başlık', { exact: true }).fill('Sentetik eksik taslak'); await manager.getByLabel('Sınav numarası', { exact: true }).fill('partial'); await manager.getByRole('button', { name: 'Mevcut soruyu ekle', exact: true }).click();
    const picker = manager.getByRole('dialog'); await picker.getByRole('button', { name: 'Ekle', exact: true }).first().click(); await picker.getByRole('button', { name: 'Tamam', exact: true }).click(); await manager.getByRole('button', { name: 'Taslağı kaydet' }).click();
    await expect(manager.getByRole('button', { name: 'Yayımla', exact: true })).toBeDisabled(); await expect(manager.getByText(/İki seçeneği yayımlamak için tam 125 soru gerekir/)).toBeVisible();
    const id = fixture('paired-exam-draft'); await publishPair(manager, id);
    mkdirSync('artifacts/exam-variants', { recursive: true });
    for (const width of [320, 834, 1280]) { await manager.setViewportSize({ width, height: 900 }); expect(await manager.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true); await manager.evaluate(() => scrollTo(0, 0)); await manager.screenshot({ path: `artifacts/exam-variants/admin-${width}.png` }); }
    await login(page); await page.getByRole('button', { name: 'Silahsız sınav', exact: true }).click(); const unarmed = page.locator('.sinav-row').filter({ hasText: '125. Deneme Sınavı' }); await expect(unarmed).toContainText('100 soru');
    await unarmed.getByRole('button', { name: 'Sınava gir', exact: true }).click(); const response = page.waitForResponse((r) => r.url().endsWith('/exam-attempts') && r.request().method() === 'POST'); await unarmed.getByRole('button', { name: 'Sınavı başlat', exact: true }).click(); const original = (await (await response).json()).data;
    expect(original.questions).toHaveLength(100); expect(original.questions.at(-1).question.stem).toBe('Uzun sonuç sentetik soru 100'); await expect(page.getByRole('heading', { name: 'Uzun sonuç sentetik soru 1', exact: true })).toBeVisible();
    const first = manager.locator('#soru-1'); await first.getByRole('button', { name: 'Düzenle', exact: true }).click(); await first.getByLabel('Soru metni', { exact: true }).fill('Düzeltilmiş ortak sentetik soru 1'); await first.getByRole('button', { name: 'Kaydet, yayımla ve sınavda güncelle', exact: true }).click(); await expect(first.locator('.question-stem')).toHaveText('Düzeltilmiş ortak sentetik soru 1');
    await page.reload(); await expect(page.getByRole('heading', { name: 'Uzun sonuç sentetik soru 1', exact: true })).toBeVisible();
    await page.getByRole('link', { name: 'Deneme sınavları', exact: true }).click(); await page.getByRole('button', { name: 'Silahlı sınav', exact: true }).click(); const armed = page.locator('.sinav-row').filter({ hasText: '125. Deneme Sınavı' }); await expect(armed).toContainText('125 soru'); await armed.getByRole('button', { name: 'Sınava gir', exact: true }).click(); const armedResponse = page.waitForResponse((r) => r.url().endsWith('/exam-attempts') && r.request().method() === 'POST'); await armed.getByRole('button', { name: 'Sınavı başlat', exact: true }).click(); const full = (await (await armedResponse).json()).data; expect(full.questions).toHaveLength(125); expect(full.questions.at(-1).question.stem).toBe('Uzun sonuç sentetik soru 125'); await expect(page.getByRole('heading', { name: 'Düzeltilmiş ortak sentetik soru 1', exact: true })).toBeVisible();
  } finally { await managerContext.close(); }
});

test('mobil aynı sınavı silahsız 100 ve silahlı 125 soru ile başlatır', async ({ browser, page }) => {
  test.setTimeout(60_000); const id = fixture('paired-exam-draft'); const managerContext = await browser.newContext(); const manager = await managerContext.newPage();
  try { await adminLogin(manager); await publishPair(manager, id); } finally { await managerContext.close(); }
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('http://127.0.0.1:5185'); await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test'); await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!'); await page.getByRole('button', { name: 'Giriş yap', exact: true }).click(); await page.getByRole('tab', { name: 'Deneme', exact: true }).click();
  for (const [label, count] of [['Silahsız sınavlar', 100], ['Silahlı sınavlar', 125]] as const) {
    await page.getByRole('button', { name: label, exact: true }).click(); await expect(page.getByText(new RegExp(`${count} soru ·`))).toBeVisible(); await page.getByRole('button', { name: 'Sınava gir', exact: true }).click();
    const response = page.waitForResponse((r) => r.url().endsWith('/exam-attempts') && r.request().method() === 'POST'); await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click(); const exam = (await (await response).json()).data; expect(exam.questions).toHaveLength(count); expect(exam.questions.at(-1).question.stem).toBe(`Uzun sonuç sentetik soru ${count}`); await expect(page.getByText(`Soru 1 / ${count}`, { exact: true })).toBeVisible(); await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
  }
});
