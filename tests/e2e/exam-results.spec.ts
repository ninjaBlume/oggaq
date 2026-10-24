import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture, login } from './student';

test.use({ baseURL: 'http://127.0.0.1:5183' });
test.beforeEach(() => { fixture('setup-study'); });
test.afterAll(() => { fixture('cleanup'); });
async function mobileLogin(page: Page) {
  await page.goto('http://127.0.0.1:5185');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Sonuçlar', exact: true }).click();
  await page.getByRole('button', { name: /sonucunu incele$/ }).click();
  await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
}

async function scrollToLastQuestion(page: Page) {
  const list = page.getByTestId('exam-review-list'); const last = page.getByTestId('result-question-200');
  // Variable-height rows are measured as the user scrolls; no "next question" or load-more interaction.
  for (let step = 0; step < 240 && !(await last.count()); step++) {
    const before = await page.getByTestId(/^result-question-/).last().getAttribute('data-testid');
    await list.evaluate((node) => { node.scrollTop += 2200; });
    await expect.poll(async () => {
      await list.evaluate((node) => { node.scrollTop += 2200; });
      return (await last.count()) > 0 || (await page.getByTestId(/^result-question-/).last().getAttribute('data-testid')) !== before;
    }).toBe(true);
  }
}

test('web: 200 soruluk sonuç tek sayfada; doğru/yanlış/boş, son soruda favori/bildirim ve yeniden açma', async ({ page }) => {
  test.setTimeout(90_000); const path = fixture('long-result'); await login(page); await page.goto(path);
  await expect(page.getByTestId('result-question-1')).toContainText('Doğru cevap · Senin cevabın');
  await expect(page.getByTestId('result-question-2')).toContainText('Yanlış');
  await expect(page.getByTestId('result-question-3')).toContainText('Boş bırakıldı');
  await expect(page.getByTestId(/^result-question-/)).toHaveCount(200);
  await expect(page.getByRole('button', { name: 'Sonraki soru' })).toHaveCount(0);
  const last = page.getByTestId('result-question-200'); await last.scrollIntoViewIfNeeded();
  await expect(last.getByRole('heading', { name: 'Uzun sonuç sentetik soru 200', exact: true })).toBeVisible();
  await expect(last).toContainText('Sentetik açıklama 200');
  await last.getByRole('button', { name: '☆ Favoriye ekle' }).click(); await expect(last.getByRole('button', { name: '★ Favorilerde' })).toBeVisible();
  await last.getByRole('button', { name: 'Soruyu bildir', exact: true }).click(); await last.getByRole('radio', { name: 'Diğer', exact: true }).check(); await last.getByRole('button', { name: 'Bildirimi gönder' }).click(); await expect(last.getByRole('button', { name: 'Bildirdin' })).toBeVisible();
  await expect(page.getByTestId('result-question-1').getByRole('button', { name: '☆ Favoriye ekle' })).toHaveCount(1);
  await page.reload(); await last.scrollIntoViewIfNeeded(); await expect(last.getByRole('button', { name: '★ Favorilerde' })).toBeVisible(); await expect(last.getByRole('button', { name: 'Bildirdin' })).toBeVisible();
  for (const option of await last.getByRole('radio').all()) await expect(option).toBeDisabled();
});

test('mobil: 200 soruluk sonuç kaydırılarak son soruya ulaşır, kartları sanallaştırır ve doğru soruyu favoriler', async ({ page }) => {
  test.setTimeout(120_000); fixture('long-result'); await page.setViewportSize({ width: 390, height: 844 }); await mobileLogin(page);
  await expect(page.getByRole('button', { name: 'Sonraki soru' })).toHaveCount(0);
  await expect(page.getByTestId('result-question-1')).toContainText('Senin cevabın');
  await expect(page.getByTestId('result-question-1').getByRole('radio', { name: /Doğru cevap/ })).toHaveAttribute('aria-checked', 'true');
  expect(await page.getByTestId(/^result-question-/).count()).toBeLessThan(40);
  const list = page.getByTestId('exam-review-list'); const last = page.getByTestId('result-question-200');
  await scrollToLastQuestion(page);
  await last.scrollIntoViewIfNeeded(); await expect(last).toContainText('Sentetik açıklama 200');
  expect(await page.getByTestId(/^result-question-/).count()).toBeLessThan(40);
  let release!: () => void; const held = new Promise<void>((resolve) => { release = resolve; }); let lost = true;
  await page.route('**/favorites/*', async (route) => { if (lost) { lost = false; await held; await route.fetch(); await route.abort('internetdisconnected'); } else await route.continue(); });
  await last.getByRole('button', { name: '☆ Favoriye ekle' }).click();
  await list.evaluate((node) => { node.scrollTop = 0; }); await expect(last).toHaveCount(0); release();
  await scrollToLastQuestion(page); await last.scrollIntoViewIfNeeded(); await expect(last.getByRole('alert')).toBeVisible();
  await last.getByRole('button', { name: 'Yeniden dene', exact: true }).click(); await expect(last.getByRole('button', { name: '★ Favorilerde' })).toBeVisible();
  await last.getByRole('button', { name: 'Soruyu bildir', exact: true }).click(); await page.getByRole('radio', { name: 'Diğer', exact: true }).click(); await page.getByRole('button', { name: 'Bildirimi gönder', exact: true }).click(); await expect(last.getByText('Bildirdin', { exact: true })).toBeVisible();
  await list.evaluate((node) => { node.scrollTop = 0; }); await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
  await expect(page.getByTestId('result-question-1').getByRole('button', { name: '☆ Favoriye ekle' })).toHaveCount(1);
});

for (const colorScheme of ['light', 'dark'] as const) test(`sonuçlar ${colorScheme} temada telefon/tablet/masaüstüne sığar`, async ({ browser }) => {
  fixture('long-result'); mkdirSync('artifacts/exam-results', { recursive: true });
  for (const surface of ['web', 'mobile'] as const) {
    const context = await browser.newContext({ baseURL: 'http://127.0.0.1:5183', colorScheme }); const page = await context.newPage();
    try {
      if (surface === 'web') { await login(page); await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click(); await page.getByRole('region', { name: 'Sınav sonuçları' }).getByRole('link').click(); } else await mobileLogin(page);
      await expect(page.getByTestId('result-question-1')).toBeAttached();
      for (const width of [320, 834, 1280]) {
        await page.setViewportSize({ width, height: 900 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        await page.getByTestId('result-question-1').scrollIntoViewIfNeeded(); await page.screenshot({ path: `artifacts/exam-results/${surface}-${colorScheme}-${width}.png`, animations: 'disabled' });
      }
    } finally { await context.close(); }
  }
});
