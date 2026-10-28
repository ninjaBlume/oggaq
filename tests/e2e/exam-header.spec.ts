import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 320, height: 950 } });
test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); });
test.afterAll(() => fixture('cleanup'));

for (const named of [true, false]) {
  test(`mobil sınav başlığı: ${named ? 'uzun sınav adı büyük yazıda taşmaz' : 'isimsiz sınav soru sayısıyla tanımlanır'}`, async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('oggaq.textSize', 'large'));
    const longTitle = '122. Temel Eğitim Sınav Soruları — Silahlı';
    // Only the presentation metadata varies; questions and saving use the test API.
    await page.route('**/contexts/*/exam-attempts', async route => {
      if (route.request().method() !== 'POST') return route.continue();
      const response = await route.fetch();
      const body = await response.json();
      if (named) body.data.official_exam.title = longTitle;
      else body.data.official_exam = null;
      await route.fulfill({ response, json: body });
    });
    await page.goto('/');
    await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
    await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    await page.getByRole('tab', { name: 'Deneme', exact: true }).click();
    await page.getByRole('button', { name: 'Sınava gir', exact: true }).click();
    await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click();
    const title = page.getByTestId('exam-header-title');
    await expect(title).toHaveText(named ? longTitle : '3 soruluk sınav');
    for (const width of [320, 390, 1024]) {
      await page.setViewportSize({ width, height: 950 });
      const box = await title.boundingBox();
      const back = await page.getByRole('button', { name: 'Geri dön', exact: true }).boundingBox();
      expect(box).toBeTruthy(); expect(back).toBeTruthy();
      expect(box!.x).toBeGreaterThanOrEqual(back!.x + back!.width);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      mkdirSync('artifacts/question-map', { recursive: true });
      await page.screenshot({ path: `artifacts/question-map/header-${named ? 'named' : 'fallback'}-${width}.png` });
    }
  });
}
