import { test, expect } from '@playwright/test';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';
import { mkdirSync } from 'node:fs';
let original: string;
test.beforeEach(() => { fixture('setup-study'); original = JSON.parse(fixture('legacy-exam-fragments')).original; });
test.afterAll(() => fixture('cleanup'));
for (const mobile of [false, true]) {
  test(`${mobile ? 'mobil ana sayfa ve sonuçlar' : 'web sonuçlar'}: aynı sınavın eski 1 ve 11 soruluk parçaları ayrı deneme değildir`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.goto(mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183');
    await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
    await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
    const statsResponse = mobile ? page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/stats')) : null;
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    if (mobile) {
      const stats = (await (await statsResponse!).json()).data;
      expect(stats.answers.total).toBe(30);
      expect(stats.answers.correct).toBe(18);
      expect(stats.exams.completed).toBe(1);
      expect(stats.exams.average_score_percent).toBe(38.89);
      await expect(page.getByRole('button', { name: 'Sentetik asıl ders sınavı, %38.89 doğru', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: /^(1|11) soruluk deneme,/ })).toHaveCount(0);
      await expect(page.getByLabel('Tamamlanan sınav: 1', { exact: true })).toBeVisible();
      await page.getByRole('tab', { name: 'Sonuçlar', exact: true }).click();
    } else await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
    const cards = mobile ? page.getByTestId('exam-result-card') : page.locator('.history-row');
    await expect(cards).toHaveCount(1);
    await expect(cards).toContainText('Sentetik asıl ders sınavı');
    await expect(page.getByText(/^(1|11) soruluk deneme$/)).toHaveCount(0);
    mkdirSync('artifacts/legacy-exam-fix', { recursive: true });
    await page.screenshot({ path: `artifacts/legacy-exam-fix/${mobile ? 'mobile' : 'web'}-results.png` });
    const loaded = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/exam-attempts/'+original));
    await cards.click();
    const data = (await (await loaded).json()).data;
    expect(data.id).toBe(original);
    expect(data.question_count).toBe(18);
    expect(data.result.correct).toBe(7);
    expect(data.result.incorrect).toBe(11);
    expect(data.result.score_percent).toBe(38.89);
    await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
  });
}
