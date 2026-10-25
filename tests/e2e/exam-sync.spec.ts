import { test, expect, type Page } from '@playwright/test';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture, login, enterDeneme } from './student';

test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); });
test.afterAll(() => fixture('cleanup'));

for (const platform of ['web', 'mobile'] as const) {
  test.describe(platform, () => {
    test.use({ baseURL: platform === 'web' ? 'http://127.0.0.1:5183' : mobilePreviewUrl, viewport: { width: 390, height: 844 } });
    async function enter(page: Page) {
      await page.clock.install();
      if (platform === 'web') await login(page);
      else {
        await page.goto('/');
        await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
        await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
        await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
        await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible();
      }
      // Watch the one-second clock's work, including cleanup, rather than relying on wall-clock timings.
      await page.evaluate(() => {
        const active = new Set<number>();
        const interval = window.setInterval.bind(window);
        const clear = window.clearInterval.bind(window);
        Object.assign(window, {
          setInterval: (handler: TimerHandler, delay?: number, ...args: unknown[]) => {
            const id = interval(handler, delay, ...args);
            if (delay === 1000) active.add(id);
            return id;
          },
          clearInterval: (id?: number) => { if (id !== undefined) active.delete(id); clear(id); },
          examTimerCount: () => active.size,
        });
      });
      const started = page.waitForResponse(r => /\/exam-attempts$/.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
      if (platform === 'web') await enterDeneme(page);
      else {
        await page.getByRole('tab', { name: 'Deneme', exact: true }).click();
        await page.getByRole('button', { name: 'Sınava gir', exact: true }).click();
        await page.getByRole('button', { name: 'Sınavı başlat', exact: true }).click();
      }
      const response = await started;
      const exam = (await response.json()).data;
      await expect(page.getByText('Soru 1 / 3', { exact: true })).toBeVisible();
      const authorization = response.request().headers()['authorization'];
      const cookie = (await page.context().cookies()).find(c => c.name === 'XSRF-TOKEN');
      const headers: Record<string, string> = authorization ? { Authorization: authorization } : {
        'X-XSRF-TOKEN': decodeURIComponent(cookie!.value), Origin: new URL(page.url()).origin, Referer: page.url(),
      };
      return { exam, headers, url: `http://127.0.0.1:8001/api/v1/contexts/${exam.context_id}/exam-attempts/${exam.id}` };
    }

    test('küçük durum yanıtı diğer cihazın cevabını getirir; bitince tam sonuç bir kez yüklenir', async ({ page }) => {
      const fullReads: string[] = [];
      page.on('request', r => { if (r.method() === 'GET' && /\/exam-attempts\/[^/]+$/.test(new URL(r.url()).pathname)) fullReads.push(r.url()); });
      const { exam, headers, url } = await enter(page);
      // New attempts use the complete start response; opening must not download the questions again.
      const openingReads = fullReads.length;
      expect(openingReads).toBe(0);
      await expect.poll(() => page.evaluate(() => (window as unknown as { examTimerCount: () => number }).examTimerCount())).toBe(1);
      const selected = exam.questions[0].question.options[1].id;
      const saved = await page.request.put(`${url}/answers/${exam.questions[0].id}?compact=true`, { headers, data: { base_version: exam.revision, selected_option_id: selected } });
      expect(saved.ok(), await saved.text()).toBe(true);
      const stateRead = page.waitForResponse(r => r.url() === `${url}/state` && r.status() === 200);
      await page.clock.fastForward(15_000);
      const response = await stateRead;
      const state = (await response.json()).data;
      expect(state.questions).toBeUndefined();
      expect(state.answers).toHaveLength(3);
      expect(state.answers[0].selected_option_id).toBe(selected);
      await expect(page.getByRole('radio', { name: /Sentetik B/ })).toBeChecked();
      expect(fullReads).toHaveLength(openingReads);
      const finished = await page.request.post(`${url}/finish`, { headers, data: { base_version: state.revision } });
      expect(finished.ok()).toBe(true);
      const finalRead = page.waitForResponse(r => r.url() === url && r.request().method() === 'GET');
      await page.clock.fastForward(15_000);
      await finalRead;
      await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => (window as unknown as { examTimerCount: () => number }).examTimerCount())).toBe(0);
      expect(fullReads).toHaveLength(openingReads + 1);
      await expect(page.getByTestId('result-question-3')).toBeVisible();
    });

    test('eski API durum ucunu sunmuyorsa tam kayıtla çalışmaya devam eder', async ({ page }) => {
      let stateCalls = 0;
      await page.route('**/exam-attempts/*/state', route => { stateCalls++; return route.fulfill({ status: 404, json: { detail: 'Not found' } }); });
      const { url } = await enter(page);
      for (let i = 0; i < 2; i++) {
        const fullRead = page.waitForResponse(r => r.url() === url && r.request().method() === 'GET');
        await page.clock.fastForward(15_000);
        await fullRead;
        await expect(page.getByText('Soru 1 / 3', { exact: true })).toBeVisible();
      }
      expect(stateCalls).toBe(1);
      await expect(page.getByRole('alert')).toHaveCount(0);
    });

    test('kaydedilmiş ama yanıtı takılmış cevap zaman aşımından sonra güvenle tekrar edilir', async ({ page }) => {
      await enter(page);
      let lost = false;
      let serverSaved!: () => void;
      const saved = new Promise<void>(resolve => { serverSaved = resolve; });
      await page.route('**/exam-attempts/*/answers/*', async route => {
        if (!lost) {
          lost = true;
          // The API commits, but no response reaches the app. Leave the request pending until its timeout.
          await route.fetch();
          serverSaved();
        } else await route.continue();
      });
      await page.getByRole('radio', { name: /Sentetik A/ }).click();
      await saved;
      await page.clock.fastForward(20_000);
      await expect(page.getByRole('alert')).toContainText('Sunucu yanıtı gecikti');
      await expect(page.getByRole('radio', { name: /Sentetik B/ })).toBeDisabled();
      const retry = page.waitForResponse(r => new URL(r.url()).pathname.includes('/answers/') && r.request().method() === 'PUT');
      await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
      const retried = (await (await retry).json()).data;
      expect(retried.revision).toBe(2);
      expect(retried.answers.filter((a: { selected_option_id: string | null }) => a.selected_option_id !== null)).toHaveLength(1);
      await expect(page.getByText('Cevaplar sunucuda kayıtlı', { exact: true })).toBeVisible();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    if (platform === 'mobile') test('yavaş yenileme her 15 saniyede kesilip baştan başlamaz; timeout sonrası yeniden denenir', async ({ page }) => {
      let calls = 0;
      let stalled = true;
      await page.route('**/exam-attempts/*/state', async route => {
        calls++;
        if (!stalled) await route.continue();
      });
      await enter(page);
      await page.clock.fastForward(15_000);
      await expect.poll(() => calls).toBe(1);
      await page.clock.fastForward(15_000);
      expect(calls).toBe(1);
      await page.clock.fastForward(5_000);
      await expect(page.getByRole('alert')).toContainText('Sunucu yanıtı gecikti');
      stalled = false;
      await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
      await expect(page.getByRole('alert')).toHaveCount(0);
      await expect(page.getByText('Soru 1 / 3', { exact: true })).toBeVisible();
      expect(calls).toBe(2);
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });

    if (platform === 'mobile') test('cevap kaydı süren yenilemeyi iptal ettikten sonra periyodik kontrol devam eder', async ({ page }) => {
      let calls = 0;
      await page.route('**/exam-attempts/*/state', async route => {
        calls++;
        if (calls > 1) await route.continue();
      });
      await enter(page);
      await page.clock.fastForward(15_000);
      await expect.poll(() => calls).toBe(1);
      await page.getByRole('radio', { name: /Sentetik A/ }).click();
      await expect(page.getByText('Cevaplar sunucuda kayıtlı', { exact: true })).toBeVisible();
      const refreshed = page.waitForResponse(r => r.url().endsWith('/state') && r.status() === 200);
      await page.clock.fastForward(15_000);
      await refreshed;
      expect(calls).toBe(2);
      await expect(page.getByRole('radio', { name: /Sentetik A/ })).toBeChecked();
      await page.unrouteAll({ behavior: 'ignoreErrors' });
    });
  });
}
