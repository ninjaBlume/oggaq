import { test, expect } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fixture, login } from './student';
import { mobilePreviewUrl } from '../../playwright.config';

test.beforeEach(()=>{fixture('setup-study');fixture('upcoming-calendar');});
test.afterAll(()=>fixture('cleanup'));
for(const platform of ['web','mobile']as const)for(const scheme of ['light','dark']as const)test(`${platform} ${scheme}: ana sayfada gün sayacı, hazır ekran, takvim bağlantısı ve boş/eski durum`,async({browser})=>{
 const context=await browser.newContext({baseURL:platform==='web'?'http://127.0.0.1:5183':mobilePreviewUrl,colorScheme:scheme,viewport:{width:390,height:900}});const page=await context.newPage();
 let release!:()=>void;const held=new Promise<void>(r=>release=r);let first=true;
 await page.route('**/exam-calendar/next',async route=>{if(first){first=false;await held;}await route.continue();});
 async function refresh(){if(platform==='web')await page.reload();else{await page.getByRole('tab',{name:'Profil',exact:true}).click();await page.getByRole('tab',{name:'Ana sayfa',exact:true}).click();}}
 try{
  if(platform==='web')await login(page);else{await page.goto('/');await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-student@example.test');await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByText('Merhaba, E2E.',{exact:true})).toBeVisible();}
  if(platform==='web')await expect(page.getByRole('button',{name:'Temel eğitim',exact:true})).toBeEnabled();else await expect(page.getByRole('button',{name:'Sınava gir',exact:true})).toBeVisible();
  await expect(page.getByText('Sınav tarihi yükleniyor…',{exact:true})).toBeVisible();release();
  const card=page.getByTestId('upcoming-exam');await expect(card).toContainText('990. Temel');await expect(card).toContainText('790. Yenileme');await expect(card).toContainText('10');await expect(card).toContainText('gün kaldı');
  mkdirSync('artifacts/upcoming-exam/screens',{recursive:true});
  for(const width of [320,390,834,1280]){await page.setViewportSize({width,height:900});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);if(platform==='mobile'){const hero=await page.getByTestId('home-focus').boundingBox();const upcoming=await card.boundingBox();expect(upcoming!.y).toBeGreaterThanOrEqual(hero!.y+hero!.height);const header=await page.getByTestId('main-header').boundingBox();const brand=await page.getByTestId('header-brand-content').boundingBox();expect(Math.abs((brand!.x+brand!.width/2)-(header!.x+header!.width/2))).toBeLessThanOrEqual(1);}await page.screenshot({path:`artifacts/upcoming-exam/screens/${platform}-${scheme}-${width}.png`,fullPage:true,animations:'disabled'});}
  let showCalendar!:()=>void;const calendarHeld = new Promise<void>(resolve => showCalendar=resolve);
  await page.route(/\/exam-calendar\?/,async route=>{await calendarHeld;await route.continue();});
  try {
    await card.click();await expect(page.getByRole('heading',{name:'Sınav tarihleri ve kurallar',exact:true})).toBeVisible();
    await expect(page.getByTestId('calendar-rules')).toContainText('Sınav sistemi ve başarı kuralları');
  } finally { showCalendar(); }
  await expect(page.getByText('990. Temel',{exact:true})).toBeVisible();
  await expect(page.getByTestId('calendar-entry').first()).toContainText('10 gün kaldı');
  if(platform==='web')await page.getByRole('link',{name:'Ana sayfaya dön',exact:true}).click();else await page.getByRole('button',{name:'Ana sayfaya dön',exact:true}).click();
  if(platform==='web')await page.getByRole('link',{name:'Deneme sınavları',exact:true}).click();else await page.getByRole('tab',{name:'Ana sayfa',exact:true}).click();
  fixture('calendar-stale');await refresh();await expect(page.getByTestId('upcoming-exam')).toContainText('Son doğrulanmış takvim');await expect(page.getByTestId('upcoming-exam')).toContainText('10');
  fixture('upcoming-empty');await refresh();await expect(page.getByText('Yaklaşan sınav tarihi henüz doğrulanmadı.',{exact:true})).toBeVisible();await expect(page.getByTestId('upcoming-exam')).toHaveCount(0);
 }finally{release();await context.close();}
});
