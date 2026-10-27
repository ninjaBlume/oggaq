import { test, expect } from '@playwright/test';
import { fixture } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); fixture('renewal-exams'); });
test.afterAll(() => fixture('cleanup'));
for (const mobile of [false, true]) test(`${mobile ? 'mobil' : 'web'} Deneme ve Ders kartları Temel/Yenileme için tam sınav tarihini gösterir`, async ({ page }) => {
  // Real API catalogue; vary only synthetic public date metadata to cover both import formats.
  await page.route('**/api/v1/official-exams?*', async route => {
    const response = await route.fetch(); const body = await response.json();
    for (const exam of body.data) {
      if (exam.education_type === 'renewal') {
        const date = exam.subject ? '2024-02-11' : '2026-08-29';
        exam.source = { id: 'synthetic-date-source', title: 'Sentetik tarih kaynağı', url: null,
          citation: `EGM ${exam.exam_number}. Yenileme Eğitim A kitapçığı, ${date}. Sentetik test kaynağı.` };
      } else exam.title += ' (15.07.2023)';
    }
    await route.fulfill({ response, json: body });
  });
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  if (mobile) await page.getByRole('tab', { name: 'Deneme', exact: true }).click();
  const basic = () => page.getByRole('button', { name: mobile ? 'Temel eğitim sınavları' : 'Temel eğitim', exact: true });
  const renewal = () => page.getByRole('button', { name: mobile ? 'Yenileme eğitimi sınavları' : 'Yenileme eğitimi', exact: true });
  const cards = () => mobile ? page.locator('[data-testid="official-exam-entry"]:visible') : page.locator('.sinav-row');
  await expect(cards().first()).toContainText('15 Temmuz 2023');
  await renewal().click(); await expect(cards().first()).toContainText('29 Ağustos 2026');
  await page.getByRole('button', { name: 'Silahsız', exact: true }).click();
  await expect(cards().first()).toContainText('29 Ağustos 2026');
  if (mobile) {
    await page.getByRole('tab', { name: 'Ders', exact: true }).click();
    await basic().click(); await expect(cards().first()).toContainText('15 Temmuz 2023');
    await renewal().click(); await expect(cards().first()).toContainText('11 Şubat 2024');
  } else {
    await page.getByRole('link', { name: 'Ders sınavları', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Ders sınavları', exact: true })).toBeVisible();
    // The local web QA page lists both educations together; it has no education selector here.
    await expect(cards().filter({ has: page.getByRole('heading', { name: '1. Ders Sınavı', exact: true }) })).toContainText('15 Temmuz 2023');
    await expect(cards().filter({ has: page.getByRole('heading', { name: '98. Ders Sınavı', exact: true }) })).toContainText('11 Şubat 2024');
  }
  const renewalCard = () => mobile ? cards().first() : cards().filter({ has: page.getByRole('heading', { name: '98. Ders Sınavı', exact: true }) });
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(renewalCard()).toContainText('11 Şubat 2024');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (mobile) expect((await cards().first().boundingBox())!.height).toBeLessThanOrEqual(110);
  }
});
