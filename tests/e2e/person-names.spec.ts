import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(() => fixture('setup-study'));
test.afterAll(() => fixture('cleanup'));
for (const platform of ['web', 'mobile'] as const) for (const scheme of ['light', 'dark'] as const) {
  test(`${platform} ${scheme}: tam ad düzenleme, iki/üç baş harf ve kalıcılık`, async ({ browser }) => {
    const context = await browser.newContext({ baseURL: platform === 'web' ? 'http://127.0.0.1:5183' : mobilePreviewUrl, viewport: { width: 320, height: 1000 }, colorScheme: scheme });
    if (platform === 'mobile' && scheme === 'dark') await context.addInitScript(() => localStorage.setItem('oggaq.textSize', 'large'));
    if (platform === 'mobile') await context.addInitScript(value => localStorage.setItem('oggaq.theme', value), scheme);
    const page = await context.newPage();
    let fail = true;
    await page.route('**/api/v1/me', async route => {
      if (route.request().method() === 'PATCH' && fail) await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ code: 'temporarily_unavailable', message: 'Ad güncellenemedi, tekrar dene.' }) });
      else await route.continue();
    });
    const openProfile = async () => {
      if (platform === 'web') await page.getByRole('link', { name: 'Hesabım', exact: true }).click();
      else await page.getByRole('tab', { name: 'Profil', exact: true }).click();
    };
    const edit = async () => {
      if (platform === 'mobile') await page.getByRole('button', { name: /^Hesabım:/ }).click();
    };
    try {
      await page.goto('/');
      await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
      await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
      await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
      if (platform === 'web') await expect(page.getByTestId('header-initials')).toHaveText('EÖ');
      else {
        await expect(page.getByRole('button', { name: 'Profilimi aç', exact: true })).toHaveCount(0);
        await expect(page.getByTestId('header-person')).toHaveCount(0);
      }
      await openProfile();
      for (const [name, initials] of [['Ayşe Yılmaz', 'AY'], ['Ayşe Deniz Yılmaz', 'ADY'], ['Ayşe Deniz Nur Yılmaz', 'ADY']] as const) {
        await edit();
        const field = page.getByLabel('Ad soyad', { exact: true });
        await field.fill(name);
        if (fail) {
          await page.getByRole('button', { name: 'Ad soyadı kaydet', exact: true }).click();
          await expect(page.getByRole('alert').first()).toBeVisible();
          await expect(field).toHaveValue(name);
          fail = false;
        }
        const saved = page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === '/api/v1/me' && r.ok());
        await page.getByRole('button', { name: 'Ad soyadı kaydet', exact: true }).click();
        expect((await (await saved).json()).data.name).toBe(name);
        await expect(page.getByText('Ad soyadın güncellendi.', { exact: true })).toBeVisible();
        if (platform === 'mobile') await page.getByRole('button', { name: 'Geri dön', exact: true }).click();
        if (platform === 'web') await expect(page.getByTestId('header-initials')).toHaveText(initials);
        await expect(page.getByTestId('profile-initials')).toHaveText(initials);
        await expect(page.getByTestId('profile-full-name')).toHaveText(name);
      }
      mkdirSync('artifacts/person-names/screens', { recursive: true });
      for (const width of [320, 834, 1280]) {
        await page.setViewportSize({ width, height: 1000 });
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
        if (platform === 'mobile') {
          const header = await page.getByTestId('main-header').boundingBox();const brand = await page.getByTestId('header-brand-content').boundingBox();
          expect(Math.abs((brand!.x + brand!.width / 2) - (header!.x + header!.width / 2))).toBeLessThanOrEqual(1);
        }
        await page.screenshot({ path: `artifacts/person-names/screens/${platform}-${scheme}-${width}.png`, fullPage: true });
      }
      await page.reload();
      // The browser QA mobile preview keeps tokens in memory. Native uses
      // SecureStore; signing in again verifies the saved server name here.
      if (platform === 'mobile') {
        await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
        await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
        await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
      }
      if (platform === 'web') await expect(page.getByTestId('header-initials')).toHaveText('ADY');
      if (platform === 'mobile') await openProfile();
      await expect(page.getByTestId('profile-full-name')).toHaveText('Ayşe Deniz Nur Yılmaz');
      if (platform === 'web') {
        await page.getByLabel('Ad soyad', { exact: true }).fill('  ');
        await expect(page.getByRole('button', { name: 'Ad soyadı kaydet', exact: true })).toBeDisabled();
      }
    } finally { await context.close(); }
  });
}
