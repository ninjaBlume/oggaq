import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture, login, enterDeneme, enterDers } from './student';

test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); });
test.afterAll(() => fixture('cleanup'));

for (const platform of ['web', 'mobile'] as const) {
  test.describe(platform, () => {
    test.use({ baseURL: platform === 'web' ? 'http://127.0.0.1:5183' : mobilePreviewUrl, viewport: { width: 390, height: 950 } });
    for (const kind of ['deneme', 'ders'] as const) {
      test(`${kind}: ilk cevap anahtarı açar, değiştirme/temizleme engellenir ve yeniden açılınca kilit korunur`, async ({ page }) => {
        const colorScheme = kind === 'deneme' ? 'light' : 'dark';
        if (platform === 'mobile') await page.addInitScript(value => localStorage.setItem('oggaq.theme', value), colorScheme);
        if (platform === 'web') await login(page);
        else {
          await page.goto('/');
          await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
          await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
          await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
          await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible();
        }
        const started = page.waitForResponse(r => r.request().method() === 'POST' && /\/exam-attempts$/.test(new URL(r.url()).pathname));
        if (platform === 'web') await (kind === 'deneme' ? enterDeneme(page) : enterDers(page));
        else {
          await page.getByRole('tab', { name: kind === 'deneme' ? 'Deneme' : 'Ders', exact: true }).click();
          await page.getByRole('button', { name: 'Sınava gir', exact: true }).click();
          await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click();
        }
        const start = await started;
        const initial = (await start.json()).data;
        expect(initial.questions.every((q: { feedback: unknown }) => q.feedback === null)).toBe(true);
        if (platform === 'mobile') {
          await expect(page.getByTestId('exam-header-title')).toHaveText(initial.official_exam.title);
          await page.getByRole('button', { name: 'Soru listesi', exact: true }).click();
          await expect(page.getByTestId('question-map-1')).toHaveAttribute('aria-label', 'Soru 1');
          await expect(page.getByTestId(/question-map-\d+-(correct|incorrect)/)).toHaveCount(0);
          await page.getByRole('button', { name: 'Kapat', exact: true }).click();
        }
        await expect(page.getByText('Seçimin kaydedilince doğru cevap gösterilir. Yanıtını değiştiremezsin.', { exact: true })).toBeVisible();
        const saved = page.waitForResponse(r => r.request().method() === 'PUT' && /\/answers\//.test(new URL(r.url()).pathname));
        let release = () => {};
        if (platform === 'mobile') {
          const gate = new Promise<void>(resolve => { release = resolve; });
          await page.route('**/answers/**', async route => { await gate; await route.continue(); }, { times: 1 });
        }
        try {
          await page.getByRole('radio', { name: /Sentetik B/ }).click();
          if (platform === 'mobile') {
            await page.getByRole('button', { name: 'Soru listesi', exact: true }).click();
            await expect(page.getByTestId(/question-map-\d+-(correct|incorrect)/)).toHaveCount(0);
            await page.getByRole('button', { name: 'Kapat', exact: true }).click();
          }
        } finally { release(); }
        const response = await saved;
        const state = (await response.json()).data;
        expect(state.answers[0].feedback.outcome).toBe('incorrect');
        expect(state.answers.slice(1).every((a: { feedback: unknown }) => a.feedback === null)).toBe(true);
        await expect(page.getByText('Yanlış yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.', { exact: true })).toBeVisible();
        if (platform === 'mobile') {
          await page.getByRole('button', { name: 'Soru listesi', exact: true }).click();
          await expect(page.getByTestId('question-map-1')).toHaveAttribute('aria-label', 'Soru 1, yanlış');
          await expect(page.getByTestId('question-map-1-incorrect')).toBeVisible();
          await expect(page.getByTestId('question-map-2-correct')).toHaveCount(0);
          await expect(page.getByTestId('question-map-2-incorrect')).toHaveCount(0);
          await page.getByRole('button', { name: 'Kapat', exact: true }).click();
        }
        for (const option of await page.getByRole('radio', { name: /Sentetik/ }).all()) await expect(option).toBeDisabled();
        await expect(page.getByRole('button', { name: 'Cevabı temizle', exact: true })).toHaveCount(0);
        const authorization = start.request().headers()['authorization'];
        const cookie = (await page.context().cookies()).find(c => c.name === 'XSRF-TOKEN');
        const headers: Record<string, string> = authorization ? { Authorization: authorization } : { 'X-XSRF-TOKEN': decodeURIComponent(cookie!.value), Origin: new URL(page.url()).origin, Referer: page.url() };
        const url = `http://127.0.0.1:8001/api/v1/contexts/${initial.context_id}/exam-attempts/${initial.id}/answers/${initial.questions[0].id}?compact=true`;
        for (const selected_option_id of [null, state.answers[0].feedback.correct_option_id]) {
          const rejected = await page.request.put(url, { headers, data: { base_version: state.revision, selected_option_id } });
          expect(rejected.status()).toBe(409);expect((await rejected.json()).code).toBe('answer_locked');
        }
        const retry = await page.request.put(url, { headers, data: { base_version: initial.revision, selected_option_id: state.answers[0].selected_option_id } });
        expect(retry.status()).toBe(200);expect((await retry.json()).data.revision).toBe(state.revision);
        mkdirSync('artifacts/exam-feedback', { recursive: true });
        await page.screenshot({ path: `artifacts/exam-feedback/${platform}-${kind}-390.png` });
        await page.reload();
        if (platform === 'mobile') {
          await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
          await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
          await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
          await page.getByRole('button', { name: 'Denemene devam et', exact: true }).click();
        }
        await expect(page.getByText('Yanlış yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.', { exact: true })).toBeVisible();
        if (platform === 'mobile') await expect(page.getByTestId('exam-header-title')).toHaveText(initial.official_exam.title);
        for (const option of await page.getByRole('radio', { name: /Sentetik/ }).all()) await expect(option).toBeDisabled();
        await page.getByRole('button', { name: 'Sonraki soru', exact: true }).click();
        await expect(page.getByText('Soru 2 / 3', { exact: true })).toBeVisible();
        await expect(page.getByRole('radio', { name: /Sentetik A/ })).toBeEnabled();
        await page.getByRole('radio', { name: /Sentetik A/ }).click();
        await expect(page.getByText('Doğru yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.', { exact: true })).toBeVisible();
        if (platform === 'mobile') {
          await page.getByRole('button', { name: 'Soru listesi', exact: true }).click();
          await expect(page.getByTestId('question-map-1-incorrect')).toBeVisible();
          await expect(page.getByTestId('question-map-2-correct')).toBeInViewport();
          await expect(page.getByTestId('question-map-2')).toHaveAttribute('aria-selected', 'true');
          await expect(page.getByTestId('question-map-2')).toHaveAttribute('aria-label', 'Soru 2, doğru');
          await expect(page.getByTestId('question-map-3')).toHaveAttribute('aria-label', 'Soru 3');
          const correct = await page.getByTestId('question-map-2').evaluate(node => getComputedStyle(node).backgroundColor);
          const incorrect = await page.getByTestId('question-map-1').evaluate(node => getComputedStyle(node).backgroundColor);
          expect(correct).not.toBe(incorrect);
          await page.screenshot({ animations: "disabled", path: `artifacts/exam-feedback/mobile-${kind}-question-map.png` });
          await page.getByTestId('question-map-1').click();
          await expect(page.getByText('Soru 1 / 3', { exact: true })).toBeVisible();
          await expect(page.getByRole('button', { name: 'Kapat', exact: true })).toHaveCount(0);
          for (const width of [1024, 320]) {
            await page.setViewportSize({ width, height: 950 });
            if (width < 840) await page.getByRole('button', { name: 'Soru listesi', exact: true }).click();
            await expect(page.getByTestId('question-map-1-incorrect')).toBeVisible();
            await expect(page.getByTestId('question-map-2-correct')).toBeInViewport();
            expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
            await page.screenshot({ animations: "disabled", path: `artifacts/exam-feedback/mobile-${kind}-map-${colorScheme}-${width}.png` });
          }
        }
      });
    }
  });
}
