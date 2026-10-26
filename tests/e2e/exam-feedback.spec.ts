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
        await expect(page.getByText('Seçimin kaydedilince doğru cevap gösterilir. Yanıtını değiştiremezsin.', { exact: true })).toBeVisible();
        const saved = page.waitForResponse(r => r.request().method() === 'PUT' && /\/answers\//.test(new URL(r.url()).pathname));
        await page.getByRole('radio', { name: /Sentetik B/ }).click();
        const response = await saved;
        const state = (await response.json()).data;
        expect(state.answers[0].feedback.outcome).toBe('incorrect');
        expect(state.answers.slice(1).every((a: { feedback: unknown }) => a.feedback === null)).toBe(true);
        await expect(page.getByText('Yanlış yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.', { exact: true })).toBeVisible();
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
        for (const option of await page.getByRole('radio', { name: /Sentetik/ }).all()) await expect(option).toBeDisabled();
        await page.getByRole('button', { name: 'Sonraki soru', exact: true }).click();
        await expect(page.getByText('Soru 2 / 3', { exact: true })).toBeVisible();
        await expect(page.getByRole('radio', { name: /Sentetik A/ })).toBeEnabled();
        await page.getByRole('radio', { name: /Sentetik A/ }).click();
        await expect(page.getByText('Doğru yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.', { exact: true })).toBeVisible();
      });
    }
  });
}
