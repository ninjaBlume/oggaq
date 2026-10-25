import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); fixture('renewal-exams'); });
test.afterAll(() => fixture('cleanup'));

for (const mobile of [false, true]) {
 for (const width of [390, 834]) {
  test(`${mobile ? 'mobil' : 'web'} eğitim seçimi denemeleri ayırır; derslerde seçim yok (${width}px)`, async ({ page }) => {
   await page.setViewportSize({width, height: 1000});
   await page.goto(mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183');
   await page.getByLabel('E-posta adresi', {exact:true}).fill('e2e-student@example.test');
   await page.getByLabel('Parola', {exact:true}).fill('Synthetic-Browser-42!');
   await page.getByRole('button', {name:'Giriş yap',exact:true}).click();
   if (mobile) await page.getByRole('tab',{name:'Deneme',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Deneme sınavları',exact:true})).toBeVisible();
   const basic = page.getByRole('button',{name:mobile ? 'Temel eğitim sınavları' : 'Temel eğitim',exact:true});
   const renewal = page.getByRole('button',{name:mobile ? 'Yenileme eğitimi sınavları' : 'Yenileme eğitimi',exact:true});
   await expect(basic).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   const answer = page.waitForResponse(r => {
    const u=new URL(r.url());
    return u.pathname === '/api/v1/official-exams' && u.searchParams.get('education_type') === 'renewal' && u.searchParams.get('weapon_status') === 'armed';
   });
   await renewal.click();
   const data = (await (await answer).json()).data;
   expect(data).toHaveLength(1);
   expect(data[0].education_type).toBe('renewal');
   await expect(renewal).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   await expect(page.getByRole('heading',{name:'1. Deneme Sınavı',exact:true})).toBeVisible();
   const unarmedResponse = page.waitForResponse(r => {
    const u=new URL(r.url());
    return u.pathname === '/api/v1/official-exams' && u.searchParams.get('education_type') === 'renewal' && u.searchParams.get('weapon_status') === 'unarmed';
   });
   await page.getByRole('button',{name:mobile ? 'Silahsız sınavlar' : 'Silahsız sınav',exact:true}).click();
   const unarmed = (await (await unarmedResponse).json()).data;
   expect(unarmed).toHaveLength(1);
   expect(unarmed[0].education_type).toBe('renewal');
   await expect(renewal).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   mkdirSync('artifacts/education',{recursive:true});
   await page.screenshot({path:`artifacts/education/${mobile ? 'mobile' : 'web'}-${width}.png`});
   await page.getByRole('button',{name:'Sınava gir',exact:true}).click();
   const started = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/exam-attempts'));
   await page.getByRole('button',{name:'Sınavı başlat',exact:true}).click();
   expect((await (await started).json()).data.official_exam.id).toBe(unarmed[0].id);
   await expect(page.getByRole('heading',{name:mobile ? 'Sınav' : 'Denemen devam ediyor',exact:true})).toBeVisible();
   if (mobile) {
    await page.getByRole('button',{name:'Geri dön',exact:true}).click();
    await page.getByRole('tab',{name:'Ders',exact:true}).click();
   }
   else await page.getByRole('link',{name:'Ders sınavları',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Ders sınavları',exact:true})).toBeVisible();
   await expect(renewal).not.toBeVisible();
   await expect(page.getByRole('heading',{name:'1. Ders Sınavı',exact:true})).toBeVisible();
  });
 }
}

 test('yönetici deneme eğitim türünü kaydeder; ders editörü ortak kalır', async ({page}) => {
  const id=fixture('paired-exam-draft');
  await page.goto('http://127.0.0.1:5184/deneme-sinavlari');
  await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-admin@example.test');
  await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');
  await page.getByRole('button',{name:'Giriş yap',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Deneme sınavları',exact:true})).toBeVisible();
  await page.goto('http://127.0.0.1:5184/official-exams/'+id);
  await page.getByLabel('Eğitim türü',{exact:true}).selectOption('renewal');
  await page.getByRole('button',{name:'Taslağı kaydet',exact:true}).click();
  await expect(page.getByRole('status').filter({hasText:'Taslak güncellendi.'})).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Eğitim türü',{exact:true})).toHaveValue('renewal');
  await page.goto('http://127.0.0.1:5184/official-exams/new?tur=ders');
  await expect(page.getByRole('heading',{name:'Yeni ders sınavı',exact:true})).toBeVisible();
  await expect(page.getByLabel('Eğitim türü',{exact:true})).toHaveCount(0);
 });
