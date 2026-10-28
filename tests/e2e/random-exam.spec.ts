import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 950 } });
test.beforeEach(() => { fixture('setup-study'); fixture('random-pool'); });
test.afterAll(() => fixture('cleanup'));

for (const education of ['basic', 'renewal'] as const) {
  for (const [weapon, label, count, minutes] of [['armed', 'Silahlı', 125, '150'], ['unarmed', 'Silahsız', 100, '120'], ['weapon_difference', 'Silah farkı', 25, '30']] as const) {
    test(`${education} ${weapon}: sabit rastgele sınava devam ve bitince yenisini oluşturma`, async ({ page }) => {
      await page.goto('/');
      await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
      await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
      await page.getByRole('button', { name: 'Rastgele sınav ekranını aç', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Rastgele sınav', exact: true })).toBeVisible();
      await page.getByRole('button', { name: education === 'basic' ? 'Temel eğitim' : 'Yenileme eğitimi', exact: true }).click();
      await page.getByRole('button', { name: label, exact: true }).click();
      await expect(page.getByLabel('Süre (dakika)', { exact: true })).toHaveValue(minutes);
      if (weapon === 'armed') await page.getByRole('button', { name: 'Çıkınca süre dursun', exact: true }).click();
      const started = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/random-exam') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true }).click();
      const response = await started;
      expect(response.status()).toBe(200);
      const initial = (await response.json()).data;
      expect(initial.questions).toHaveLength(count);
      expect(new Set(initial.questions.map((q: { question_id: string }) => q.question_id)).size).toBe(count);
      expect(initial.random_exam.education_type).toBe(education);
      expect(initial.random_exam.weapon_status).toBe(weapon);
      await expect(page.getByTestId('exam-header-title')).toHaveText(initial.random_exam.title);
      await expect(page.getByText(`Soru 1 / ${count}`, { exact: true })).toBeVisible();
      await page.getByRole('radio', { name: 'A', exact: true }).click();
      await expect(page.getByText(/Yanıtın kaydedildi ve kilitlendi\./)).toBeVisible();
      const positioned = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname.endsWith('/position'));
      await page.getByRole('button', { name: 'Sonraki soru', exact: true }).click();
      await positioned;
      await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Rastgele sınavına devam et', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true })).toHaveCount(0);
      const resumed = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname.endsWith('/exam-attempts/'+initial.id));
      await page.getByRole('button', { name: 'Rastgele sınavına devam et', exact: true }).click();
      const reopened = (await (await resumed).json()).data;
      expect(reopened.questions.map((q: { question_id: string }) => q.question_id)).toEqual(initial.questions.map((q: { question_id: string }) => q.question_id));
      await expect(page.getByText(`Soru 2 / ${count}`, { exact: true })).toBeVisible();
      // Another device cannot replace the unfinished set even with a different type.
      const active = await page.request.post(new URL(response.url()).href, { headers: { Authorization: response.request().headers()['authorization'] }, data: { id: crypto.randomUUID(), education_type: education === 'basic' ? 'renewal' : 'basic', weapon_status: 'unarmed', duration_seconds: 7200 } });
      expect(active.ok()).toBe(true);
      expect((await active.json()).data.id).toBe(initial.id);
      await page.getByRole('button', { name: 'Denemeyi bitir', exact: true }).click();
      await page.getByRole('button', { name: 'Bitir ve değerlendir', exact: true }).click();
      await expect(page.getByText('Deneme sonucun', { exact: true })).toBeVisible();
      await expect(page.getByTestId('exam-result-blank')).toHaveText(`${count - 1}Boş`);
      await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
      await expect(page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true })).toBeVisible();
      mkdirSync('artifacts/random-exam', { recursive: true });
      await page.screenshot({ path: `artifacts/random-exam/${education}-${weapon}-setup.png` });
      const next = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/random-exam') && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true }).click();
      expect((await (await next).json()).data.id).not.toBe(initial.id);
    });
  }
}

async function openRandom(page: Page) {
  await page.goto('/');
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  await page.getByRole('button', { name: 'Rastgele sınav ekranını aç', exact: true }).click();
}

test('ilk durum okunamazsa yeni sınav açmaz; dar/geniş ve büyük yazı düzeni', async ({ page }) => {
  await page.addInitScript(() => { localStorage.setItem('oggaq.textSize', 'large'); localStorage.setItem('oggaq.theme', 'dark'); });
  let fail = true;
  await page.route('**/contexts/*/random-exam', route => fail && route.request().method() === 'GET'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic random unavailable' }) }) : route.continue());
  await openRandom(page);
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true })).toHaveCount(0);
  fail = false;
  await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true })).toBeEnabled();
  for (const width of [320, 834, 1280]) {
    await page.setViewportSize({ width, height: 1100 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const label of ['Temel eğitim', 'Yenileme eğitimi', 'Silahlı', 'Silahsız', 'Silah farkı']) {
      await expect(page.getByRole('button', { name: label, exact: true })).toBeEnabled();
    }
    await page.getByRole('heading', { name: 'Rastgele sınav', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: `artifacts/random-exam/large-${width}-setup.png` });
  }
});

test('kesin sunucu reddinden sonra seçimler değiştirilebilir', async ({ page }) => {
  let fail = true;
  const operationIds: string[] = [];
  await page.route('**/contexts/*/random-exam', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    operationIds.push(route.request().postDataJSON().id);
    if (fail) return route.fulfill({ status: 422, contentType: 'application/json', body: JSON.stringify({ message: 'Synthetic insufficient pool', errors: { education_type: ['Synthetic insufficient pool'] } }) });
    return route.continue();
  });
  await openRandom(page);
  await page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Yenileme eğitimi', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Yenileme eğitimi', exact: true }).click();
  await page.getByRole('button', { name: 'Silah farkı', exact: true }).click();
  fail = false;
  await page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true }).click();
  await expect(page.getByText('Soru 1 / 25', { exact: true })).toBeVisible();
  expect(operationIds).toHaveLength(2);
  expect(operationIds[0]).not.toBe(operationIds[1]);
});

test('kayıttan sonraki bağlantı kaybında aynı işlem ve aynı sınav geri gelir', async ({ page }) => {
  let drop = true;
  let initialId = '';
  const operationIds: string[] = [];
  await page.route('**/contexts/*/random-exam', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    operationIds.push(route.request().postDataJSON().id);
    if (!drop) return route.continue();
    const saved = await route.fetch();
    expect(saved.ok()).toBe(true);
    initialId = (await saved.json()).data.id;
    drop = false;
    return route.abort('connectionreset');
  });
  await openRandom(page);
  await page.getByRole('button', { name: 'Rastgele sınav oluştur', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Silahsız', exact: true })).toBeDisabled();
  const resumed = page.waitForResponse(r => new URL(r.url()).pathname.endsWith('/random-exam') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Yeniden dene', exact: true }).click();
  expect((await (await resumed).json()).data.id).toBe(initialId);
  expect(operationIds).toHaveLength(2);
  expect(operationIds[0]).toBe(operationIds[1]);
  await expect(page.getByText('Soru 1 / 125', { exact: true })).toBeVisible();
  // Browser preview deliberately keeps tokens in memory; log in again after a fresh page.
  await openRandom(page);
  await expect(page.getByText('Soru 1 / 125', { exact: true })).toBeVisible();
  expect(operationIds).toHaveLength(2);
});
