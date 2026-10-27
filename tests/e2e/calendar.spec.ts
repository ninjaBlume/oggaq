import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture, login } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(() => { fixture('setup-study');fixture('calendar'); });
test.afterAll(() => fixture('cleanup'));
for (const platform of ['web','mobile'] as const) for (const scheme of ['light','dark'] as const) test(`${platform} ${scheme}: menüden takvim, temel/yenileme, eski veri ve boş yıl`, async ({browser}) => {
  const context = await browser.newContext({baseURL:platform === 'web'?'http://127.0.0.1:5183':mobilePreviewUrl,colorScheme:scheme,viewport:{width:390,height:900}});const page = await context.newPage();
  if (platform === 'mobile') await context.addInitScript(value => localStorage.setItem('oggaq.theme', value), scheme);
  await page.clock.install({ time: new Date(`${new Date().getFullYear()}-10-26T12:00:00+03:00`) });
  try {
    if(platform === 'web') { await login(page);await page.getByRole('link',{name:'Sınav takvimi',exact:true}).click(); }
    else {await page.goto('/');await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-student@example.test');await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByText('Merhaba, E2E.',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Sınav takvimi',exact:true}).click();}
    await expect(page.getByRole('heading',{name:'Sınav tarihleri ve kurallar',exact:true})).toBeVisible();await expect(page.getByText('901. Temel',{exact:true})).toBeVisible();await expect(page.getByText('701. Yenileme',{exact:true})).toBeVisible();await expect(page.getByText(/Eğitim bitişi:/).first()).toBeVisible();
    const rules = page.getByTestId('calendar-rules');
    await expect(rules.getByRole('heading',{name:'Sınav sistemi ve başarı kuralları',exact:true})).toBeVisible();
    await expect(rules).toContainText('Atış becerisi 5 fişek üzerinden ölçülür.');
    if(platform === 'web') {
      await expect(rules.getByRole('link',{name:'Resmî EGM sayfası',exact:true})).toHaveAttribute('href','https://www.egm.gov.tr/ozelguvenlik');
      await expect(rules.getByRole('link',{name:/Güncel yönetmeliği/})).toHaveAttribute('href','https://www.mevzuat.gov.tr/mevzuatmetin/yonetmelik/7.5.7190.pdf');
    } else await expect(rules.getByRole('button',{name:'Resmî EGM sayfası',exact:true})).toBeEnabled();
    const cards = page.getByTestId('calendar-entry');
    await expect(cards.first()).toContainText('902. Temel');
    await expect(cards.first()).toContainText(/gün kaldı|Bugün/);
    await expect(cards.last()).toContainText('Geçmiş sınav');
    await expect(cards.last().getByText(/gün kaldı/)).toHaveCount(0);
    mkdirSync('artifacts/exam-calendar/screens',{recursive:true});
    for(const width of [320,834,1280]) { await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:`artifacts/exam-calendar/screens/${platform}-${scheme}-${width}.png`,fullPage:true,animations:'disabled'}); }
    fixture('calendar-stale');if(platform==='web')await page.reload();else {await page.getByRole('tab',{name:'Profil',exact:true}).click();await page.getByRole('button',{name:'Menüyü aç',exact:true}).click();await page.getByRole('button',{name:'Sınav takvimi',exact:true}).click();}await expect(page.getByText('Takvim güncellenemedi veya son kontrolün üzerinden zaman geçti. Son doğrulanmış tarihler gösteriliyor.',{exact:true})).toBeVisible();await expect(page.getByText('901. Temel',{exact:true})).toBeVisible();
    const year=new Date().getFullYear()+1;
    if(platform==='web')await page.getByLabel('Takvim yılı',{exact:true}).selectOption(String(year));
    else {await page.getByRole('button',{name:/Takvim yılı:/}).click();await page.getByRole('button',{name:String(year),exact:true}).click();}
    await expect(page.getByText(`${year} takvimi henüz hazır değil`,{exact:true})).toBeVisible();await expect(page.getByText('901. Temel',{exact:true})).toHaveCount(0);await expect(rules).toBeVisible();
  }finally{await context.close();}
});

test('mobil: büyük yazıda 320 px kurallar, tarih kartları ve geri dönüş', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: mobilePreviewUrl, viewport: { width: 320, height: 900 }, colorScheme: 'dark' });
  await context.addInitScript(() => localStorage.setItem('oggaq.textSize', 'large'));
  const page = await context.newPage();
  await page.clock.install({ time: new Date(`${new Date().getFullYear()}-10-26T12:00:00+03:00`) });
  try {
    await page.goto('/');
    await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
    await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
    await page.getByRole('button', { name: 'Sınav takvimi', exact: true }).click();
    const rules = page.getByTestId('calendar-rules');
    await expect(rules).toContainText('Yenileme eğitimi');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    mkdirSync('artifacts/calendar-details/screens', { recursive: true });
    await page.screenshot({ path: 'artifacts/calendar-details/screens/mobile-dark-large-rules.png' });
    await page.getByTestId('calendar-entry').first().scrollIntoViewIfNeeded();
    await expect(page.getByTestId('calendar-entry').first()).toContainText('902. Temel');
    await expect(page.getByTestId('calendar-entry').first()).toContainText('gün kaldı');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: 'artifacts/calendar-details/screens/mobile-dark-large-dates.png' });
    await page.getByRole('button', { name: 'Ana sayfaya dön', exact: true }).click();
    await expect(page.getByText('Merhaba, E2E.', { exact: true })).toBeVisible();
  } finally { await context.close(); }
});

test('mobil takvim standart yazıda kısa kartlar kullanır; tarihler ve kaynak eylemleri korunur', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto('/');
    await page.getByLabel('E-posta adresi', { exact: true }).fill('e2e-student@example.test');
    await page.getByLabel('Parola', { exact: true }).fill('Synthetic-Browser-42!');
    await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
    await page.getByRole('button', { name: 'Menüyü aç', exact: true }).click();
    await page.getByRole('button', { name: 'Sınav takvimi', exact: true }).click();
    for (const width of [320, 390, 834]) {
      await page.setViewportSize({ width, height: 900 });
      const rules = page.getByTestId('calendar-rules');
      const card = page.getByTestId('calendar-entry').first().locator('..');
      await expect(card).toContainText('Eğitim bitişi:');
      await expect(card).toContainText('Sınav:');
      const box = await card.boundingBox(); expect(box!.height).toBeLessThanOrEqual(160);
      expect((await rules.boundingBox())!.height).toBeLessThanOrEqual(480);
      for (const name of ['Silahsız temel eğitim:', 'Silahlı temel eğitim:', 'Uygulamalı atış:', 'Yenileme eğitimi:']) await expect(rules).toContainText(name);
      expect((await rules.getByRole('button', { name: 'Resmî EGM sayfası', exact: true }).boundingBox())!.height).toBeGreaterThanOrEqual(44);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      mkdirSync('artifacts/compact-calendar-results/screens', { recursive: true });
      await page.screenshot({ path: `artifacts/compact-calendar-results/screens/calendar-${width}.png`, fullPage: true });
    }
  } finally { await context.close(); }
});
