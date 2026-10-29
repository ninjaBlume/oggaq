import { test, expect } from '@playwright/test';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture } from './student';
import mobilePackage from '../../apps/mobile/package.json';

test.beforeEach(() => fixture('setup-study'));
test.afterAll(() => fixture('cleanup'));

test('Expo önizlemede mağaza güncelleme denetimi, hata kartı ve OTA kimliği gösterilmez', async ({ page }) => {
  const errors: string[] = [];
  const updateRequests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).hostname === 'u.expo.dev') updateRequests.push(request.url());
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(mobilePreviewUrl);
  await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  for (const returnFrom of ['Ana sayfa', 'Ders'] as const) {
    await page.getByRole('tab', { name: 'Profil', exact: true }).click();
    await page.getByTestId('app-release').scrollIntoViewIfNeeded();
    await expect(page.getByTestId('app-release')).toContainText(`Sürüm ${mobilePackage.version}`);
    await expect(page.getByTestId('app-release')).not.toContainText('Güncelleme');
    await expect(page.getByText('Uygulama güncellemesi', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Güncellemeleri denetle', exact: true })).toHaveCount(0);
    await expect(page.getByText('Güncelleme işlemi tamamlanamadı', { exact: true })).toHaveCount(0);
    await page.getByRole('tab', { name: returnFrom, exact: true }).click();
  }
  expect(errors).toEqual([]);
  expect(updateRequests).toEqual([]);
});
