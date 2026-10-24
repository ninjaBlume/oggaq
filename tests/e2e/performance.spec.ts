import { test, expect } from '@playwright/test';
import { fixture, login, enterDeneme } from './student';
test.use({baseURL:'http://127.0.0.1:5183'});
test.beforeEach(()=>{fixture('setup-study');fixture('official-exam');fixture('subject-exam');});
test.afterAll(()=>fixture('cleanup'));
test('web yalnız ilgili kataloğu ister; cevap metni yerine küçük kanonik durumla devam eder',async({page})=>{
 const catalogs:URL[]=[];const subjects:URL[]=[];
 page.on('request',r=>{const url=new URL(r.url());if(url.pathname==='/api/v1/official-exams')catalogs.push(url);if(url.pathname==='/api/v1/subjects')subjects.push(url);});
 await login(page);await expect.poll(()=>catalogs.length).toBeGreaterThan(0);expect(catalogs.every(u=>u.searchParams.get('scope')==='whole')).toBe(true);
 await page.getByRole('link',{name:'Ders sınavları',exact:true}).click();await expect(page.locator('.sinav-row').filter({hasText:'1. Ders Sınavı'})).toHaveCount(1);expect(subjects.some(u=>u.searchParams.get('with_exam_counts')==='true')).toBe(true);expect(catalogs.at(-1)!.searchParams.get('scope')).toBe('subject');expect(catalogs.at(-1)!.searchParams.get('subject_id')).toBeTruthy();
 await enterDeneme(page);const saved=page.waitForResponse(r=>new URL(r.url()).pathname.includes('/answers/')&&r.request().method()==='PUT');await page.getByRole('radio',{name:/Sentetik A/}).check();const response=await saved;expect(new URL(response.url()).searchParams.get('compact')).toBe('true');const data=(await response.json()).data;expect(data.questions).toBeUndefined();expect(data.answers).toHaveLength(3);await expect(page.getByText('Cevaplar sunucuda kayıtlı',{exact:true})).toBeVisible();await page.getByRole('button',{name:'Sonraki soru',exact:true}).click();await expect(page.locator('.answer-options').getByRole('radio')).toHaveCount(2);
});
test('mobil sekmeye dönüşte katalog yeniden indirilmez; cevap küçük yanıtla kaydedilir',async({page})=>{
 await page.setViewportSize({width:390,height:844});const catalogs:URL[]=[];
 page.on('request',r=>{const url=new URL(r.url());if(url.pathname==='/api/v1/official-exams')catalogs.push(url);});
 await page.goto('http://127.0.0.1:5185');await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-student@example.test');await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByText('Merhaba, E2E.',{exact:true})).toBeVisible();
 await page.getByRole('tab',{name:'Deneme',exact:true}).click();await expect(page.getByText('1. Deneme Sınavı',{exact:true})).toBeVisible();expect(catalogs).toHaveLength(1);expect(catalogs[0]!.searchParams.get('scope')).toBe('whole');
 await page.getByRole('tab',{name:'Ana sayfa',exact:true}).click();await expect(page.getByText('Merhaba, E2E.',{exact:true})).toBeVisible();await page.getByRole('tab',{name:'Deneme',exact:true}).click();await expect(page.getByText('1. Deneme Sınavı',{exact:true})).toBeVisible();expect(catalogs).toHaveLength(1);
 await page.getByRole('button',{name:'Sınava gir',exact:true}).click();await page.getByRole('button',{name:'Sınavı başlat',exact:true}).click();const saved=page.waitForResponse(r=>new URL(r.url()).pathname.includes('/answers/')&&r.request().method()==='PUT');await page.getByRole('radio').first().click();const response=await saved;expect(new URL(response.url()).searchParams.get('compact')).toBe('true');const data=(await response.json()).data;expect(data.questions).toBeUndefined();expect(data.answers).toHaveLength(3);await expect(page.getByText('Cevaplar sunucuda kayıtlı',{exact:true})).toBeVisible();
});
