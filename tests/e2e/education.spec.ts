import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

let renewalLessonId: string;
test.beforeEach(() => { fixture('setup-study'); fixture('official-exam'); fixture('subject-exam'); renewalLessonId = fixture('renewal-exams'); });
test.afterAll(() => fixture('cleanup'));

for (const mobile of [false, true]) {
 for (const width of [320, 390, 834]) {
  test(`${mobile ? 'mobil eğitim seçimi deneme ve dersleri ayırır' : 'web eğitim seçimi denemeleri ayırır'} (${width}px)`, async ({ page }) => {
   await page.setViewportSize({width, height: 1000});
   await page.goto(mobile ? mobilePreviewUrl : 'http://127.0.0.1:5183');
   await page.getByLabel('E-posta adresi', {exact:true}).fill('e2e-student@example.test');
   await page.getByLabel('Parola', {exact:true}).fill('Synthetic-Browser-42!');
   await page.getByRole('button', {name:'Giriş yap',exact:true}).click();
   if (mobile) await page.getByRole('tab',{name:'Deneme',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Deneme sınavları',exact:true})).toBeVisible();
   await expect(page.getByRole('button',{name:/^(Silahlı|Silahsız)$/})).toHaveText(['Silahlı','Silahsız']);
   const basic = page.getByRole('button',{name:mobile ? 'Temel eğitim sınavları' : 'Temel eğitim',exact:true});
   const renewal = page.getByRole('button',{name:mobile ? 'Yenileme eğitimi sınavları' : 'Yenileme eğitimi',exact:true});
   await expect(basic).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toBeVisible();
   if (mobile) {
    const card = page.locator('[data-testid="official-exam-entry"]:visible').first();
    expect((await card.boundingBox())!.height).toBeLessThanOrEqual(110);
    expect((await card.getByRole('button',{name:'Sınava gir',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
    await expect(card.getByText('Henüz girmedin',{exact:true})).toHaveCount(0);
   }
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   mkdirSync('artifacts/education',{recursive:true});
   await page.screenshot({path:`artifacts/education/${mobile ? 'mobile' : 'web'}-${width}-basic.png`});
   const answer = page.waitForResponse(r => {
    const u=new URL(r.url());
    return u.pathname === '/api/v1/official-exams' && u.searchParams.get('education_type') === 'renewal' && u.searchParams.get('weapon_status') === 'armed';
   });
   await renewal.click();
   const data = (await (await answer).json()).data;
   expect(data).toHaveLength(1);
   expect(data[0].education_type).toBe('renewal');
   await expect(renewal).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   await expect(page.getByRole('heading',{name:'1. Yenileme Eğitim Sınav Soruları',exact:true})).toBeVisible();
   await expect(page.getByText('Ağustos 2026',{exact:false})).toBeVisible();
   const unarmedResponse = page.waitForResponse(r => {
    const u=new URL(r.url());
    return u.pathname === '/api/v1/official-exams' && u.searchParams.get('education_type') === 'renewal' && u.searchParams.get('weapon_status') === 'unarmed';
   });
   await page.getByRole('button',{name:'Silahsız',exact:true}).click();
   const unarmed = (await (await unarmedResponse).json()).data;
   expect(unarmed).toHaveLength(1);
   expect(unarmed[0].education_type).toBe('renewal');
   await expect(page.getByRole('heading',{name:'1. Yenileme Eğitim Sınav Soruları',exact:true})).toBeVisible();
   await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toHaveCount(0);
   await expect(renewal).toHaveAttribute(mobile ? 'aria-selected' : 'aria-pressed','true');
   mkdirSync('artifacts/education',{recursive:true});
   await page.screenshot({path:`artifacts/education/${mobile ? 'mobile' : 'web'}-${width}.png`});
   await page.getByRole('button',{name:'Sınava gir',exact:true}).click();
   const started = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/exam-attempts'));
   await page.getByRole('button',{name:'Sınavı başlat',exact:true}).click();
   expect((await (await started).json()).data.official_exam.id).toBe(unarmed[0].id);
   await expect(page.getByRole('heading',{name:mobile ? 'Sentetik yenileme sınavı' : 'Denemen devam ediyor',exact:true})).toBeVisible();
   if (mobile) {
    await page.getByRole('button',{name:'Geri dön',exact:true}).click();
    await page.getByRole('tab',{name:'Ders',exact:true}).click();
   }
   else await page.getByRole('link',{name:'Ders sınavları',exact:true}).click();
   await expect(page.getByRole('heading',{name:'Ders sınavları',exact:true})).toBeVisible();
   if (mobile) {
    const card = page.locator('[data-testid="official-exam-entry"]:visible').first();
    await expect(card.getByRole('heading')).toBeVisible();
    expect((await card.boundingBox())!.height).toBeLessThanOrEqual(110);
    expect((await card.getByRole('button',{name:'Sınava gir',exact:true}).boundingBox())!.height).toBeGreaterThanOrEqual(44);
   }
   if (mobile) {
    await expect(basic).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toBeVisible();
    await expect(page.getByRole('heading',{name:'98. Yenileme Eğitim Sınav Soruları',exact:true})).toHaveCount(0);
    // The API and cache must isolate subject exams by education as well as subject.
    const lessonsLoaded = page.waitForResponse(r => {
     const u = new URL(r.url());
     return u.pathname === '/api/v1/official-exams' && u.searchParams.get('scope') === 'subject' && u.searchParams.get('education_type') === 'renewal' && u.searchParams.has('subject_id');
    });
    await renewal.click();
    const lessons = (await (await lessonsLoaded).json()).data;
    expect(lessons).toHaveLength(1);
    expect(lessons[0].id).toBe(renewalLessonId);
    await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toHaveCount(0);
    await basic.click();
    await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toBeVisible();
    await renewal.click();
    await page.getByRole('tab',{name:'Profil',exact:true}).click();
    await page.getByRole('tab',{name:'Ders',exact:true}).click();
    await expect(renewal).toHaveAttribute('aria-selected','true');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({path:`artifacts/education/mobile-lessons-${width}.png`});
   } else {
    await expect(renewal).not.toBeVisible();
    await expect(page.getByRole('heading',{name:'1. Ders Sınavı',exact:true})).toBeVisible();
   }
   const lessonHeading = page.getByRole('heading',{name:mobile ? '98. Yenileme Eğitim Sınav Soruları' : '98. Ders Sınavı',exact:true});
   await expect(lessonHeading).toBeVisible();
   const lesson = mobile ? page.getByTestId('official-exam-entry').filter({has:lessonHeading}) : page.locator('.sinav-row').filter({has:lessonHeading});
   await lesson.getByRole('button',{name:'Sınava gir',exact:true}).click();
   const lessonStarted = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/exam-attempts'));
   await lesson.getByRole('button',{name:'Sınavı başlat',exact:true}).click();
   expect((await (await lessonStarted).json()).data.official_exam.id).toBe(renewalLessonId);
   await expect(page.getByRole('heading',{name:mobile ? 'Sentetik yenileme ders sınavı' : 'Denemen devam ediyor',exact:true})).toBeVisible();
   if (mobile) {
    await page.getByRole('radio',{name:/Sentetik A/}).click();
    await expect(page.getByText('Doğru yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.',{exact:true})).toBeVisible();
    await page.getByRole('button',{name:'Geri dön',exact:true}).click();
    await expect(renewal).toHaveAttribute('aria-selected','true');
    await page.getByRole('button',{name:'Devam et',exact:true}).click();
    await expect(page.getByRole('radio',{name:/Sentetik A/})).toHaveAttribute('aria-checked','true');
   }
  });
 }
}

test('mobil derslerde eğitim değişimi ders seçimini korur; boş liste ve bağlantı hatası yeniden denenir', async ({page}) => {
 fixture('more-subject-exams');
 await page.goto(mobilePreviewUrl);
 await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-student@example.test');
 await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');
 await page.getByRole('button',{name:'Giriş yap',exact:true}).click();
 await page.getByRole('tab',{name:'Ders',exact:true}).click();
 const picker = page.getByRole('button',{name:'Ders seçimi',exact:true});
 await picker.click();
 await page.getByRole('button',{name:'Sentetik Güvenlik tedbirleri',exact:true}).click();
 await expect(picker).toContainText('Sentetik Güvenlik tedbirleri');
 await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toBeVisible();
 await page.route('**/api/v1/official-exams?**', async route => {
  const u = new URL(route.request().url());
  if (u.searchParams.get('scope') === 'subject' && u.searchParams.get('education_type') === 'renewal') {
   await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({message:'Synthetic unavailable'})});
  } else await route.continue();
 });
 await page.getByRole('button',{name:'Yenileme eğitimi sınavları',exact:true}).click();
 await expect(page.getByText('Bağlantı yenilenemedi',{exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toHaveCount(0);
 await page.unroute('**/api/v1/official-exams?**');
 await page.getByRole('button',{name:'Yeniden dene',exact:true}).click();
 await expect(page.getByText('Henüz ders sınavı yok',{exact:true})).toBeVisible();
 await expect(picker).toContainText('Sentetik Güvenlik tedbirleri');
 await page.getByRole('button',{name:'Temel eğitim sınavları',exact:true}).click();
 await expect(page.getByRole('heading',{name:'1. Temel Eğitim Sınav Soruları',exact:true})).toBeVisible();
 await expect(picker).toContainText('Sentetik Güvenlik tedbirleri');
});

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
