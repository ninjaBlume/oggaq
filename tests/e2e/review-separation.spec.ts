import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';

test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('favorite'); });
test.afterAll(() => fixture('cleanup'));
for (const [mobile, width] of [[false, 390], [true, 390], [true, 1024]] as const) {
  test(`${mobile ? 'mobil' : 'web'} ${width}: tekrar cevapları istatistiğe katılır, sınav sayılmaz ve kendi geçmişinde açılır`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1100 });
    if (width === 1024) await page.addInitScript(() => { localStorage.setItem('oggaq.theme', 'dark'); localStorage.setItem('oggaq.textSize', 'large'); });
    await page.goto(mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183');
    await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
    await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    if (mobile) await page.getByRole('tab', { name: 'Deneme', exact: true }).click();
    await page.getByRole('button', { name: 'Sınava gir', exact: true }).click();
    const started = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/exam-attempts'));
    await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click();
    const response = await started;
    const original = (await response.json()).data;
    const endpoint = response.url();
    const base = endpoint.replace(/\/exam-attempts$/, '');
    const bearer = response.request().headers().authorization;
    const headers: Record<string, string> = { Origin: mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183', ...(bearer ? { Authorization: bearer } : {}) };
    await page.getByRole('radio', { name: /Sentetik A/ }).click();
    await expect(page.getByText(/Yanıtın kaydedildi ve kilitlendi\./)).toBeVisible();
    await page.getByRole('button', { name: 'Denemeyi bitir', exact: true }).click();
    await page.getByRole('button', { name: 'Bitir ve değerlendir', exact: true }).click();
    await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
    const baseline = (await (await page.request.get(`${base}/stats`, { headers })).json()).data;
    expect(baseline.exams.completed).toBe(1);
    let legacy = width === 1024;
    await page.route('**/contexts/*/exam-attempts?**', async route => {
      const url = new URL(route.request().url());
      if (!legacy || url.searchParams.get('scope') !== 'review') return route.continue();
      url.searchParams.set('scope', 'exams');
      // A rolling older API can ignore scope. Such untagged normal results must not appear as review history.
      const response = await route.fetch({ url: url.href });
      return route.fulfill({ response });
    });
    if (mobile) {
      await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
      await page.getByRole('tab', { name: 'Ana sayfa', exact: true }).click();
      await page.getByRole('button', { name: 'Tekrar sınavı ekranını aç', exact: true }).click();
    } else await page.getByRole('link', { name: 'Tekrar sınavı', exact: true }).click();
    await expect(page.getByText('Tekrar çalışmaların ve kaldığın yer burada görünür.', { exact: true })).toBeVisible();
    if (mobile) await expect(page.getByTestId('exam-result-card')).toHaveCount(0);
    legacy = false;
    await page.getByRole('button', { name: 'Tekrar sınavına gir', exact: true }).last().click();
    await page.getByLabel('Soru sayısı', { exact: true }).fill('1');
    const reviewStarted = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/exam-attempts'));
    await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click();
    const review = (await (await reviewStarted).json()).data;
    expect(review.review_kind).toBe('favorite');
    if (mobile) await expect(page.getByTestId('exam-header-title')).toHaveText('Tekrar çalışması · Favorilerim');
    else await expect(page.getByRole('heading', { name: 'Tekrar çalışman', exact: true })).toBeVisible();
    await page.getByRole('radio', { name: /Sentetik A/ }).click();
    await expect(page.getByText(/Yanıtın kaydedildi ve kilitlendi\./)).toBeVisible();
    await page.getByRole('button', { name: 'Tekrarı bitir', exact: true }).click();
    await page.getByRole('button', { name: 'Bitir ve değerlendir', exact: true }).click();
    await expect(page.getByText('Tekrar sonucun', { exact: true })).toBeVisible();
    const stats = (await (await page.request.get(`${base}/stats`, { headers })).json()).data;
    expect(stats.exams).toEqual(baseline.exams);
    expect(stats.answers.total).toBe(baseline.answers.total + 1);
    expect(stats.answers.correct).toBe(baseline.answers.correct + 1);
    expect((await (await page.request.get(endpoint, { headers })).json()).data.map((item: { id: string }) => item.id)).toEqual([original.id]);
    expect((await (await page.request.get(`${endpoint}?scope=review`, { headers })).json()).data.map((item: { id: string }) => item.id)).toEqual([review.id]);
    if (mobile) await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
    else await page.getByRole('link', { name: '← Tekrar çalışmalarına dön', exact: true }).click();
    const previous = mobile ? page.getByRole('button', { name: 'Tekrar çalışması · Favorilerim sonucunu incele', exact: true }) : page.locator('.history-row').filter({ hasText: 'Tekrar çalışması · Favorilerim' });
    await expect(previous).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('artifacts/review-separation', { recursive: true });
    await page.screenshot({ path: `artifacts/review-separation/${mobile ? 'mobile' : 'web'}-${width}.png` });
    await previous.click();
    await expect(page.getByText('Tekrar sonucun', { exact: true })).toBeVisible();
    if (mobile) { await page.getByRole('button', { name: 'Geri dön', exact: true }).click(); await page.getByRole('tab', { name: 'Sonuçlar', exact: true }).click(); }
    else await page.getByRole('link', { name: 'Sonuçlarım', exact: true }).click();
    await expect(mobile ? page.getByTestId('exam-result-card') : page.locator('.history-row')).toHaveCount(1);
    await expect(page.getByText('Tekrar çalışması · Favorilerim', { exact: true })).toHaveCount(0);
  });
}
