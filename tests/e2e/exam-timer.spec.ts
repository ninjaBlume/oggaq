import { test, expect, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { mobilePreviewUrl } from '../../playwright.config';
import { fixture, login } from './student';

test.beforeEach(() => { fixture('setup-study');fixture('official-exam');fixture('subject-exam'); });
test.afterAll(() => fixture('cleanup'));
for (const platform of ['web','mobile'] as const) {
  test.describe(platform, () => {
    test.use({baseURL: platform === 'web' ? 'http://127.0.0.1:5183' : mobilePreviewUrl,viewport:{width:390,height:950}});
    async function start(page: Page,kind: 'deneme'|'ders',pause: boolean) {
      if (platform === 'web') await login(page);
      else {await page.goto('/');await page.getByLabel('E-posta adresi',{exact:true}).fill('e2e-student@example.test');await page.getByLabel('Parola',{exact:true}).fill('Synthetic-Browser-42!');await page.getByRole('button',{name:'Giriş yap',exact:true}).click();await expect(page.getByText('Merhaba, E2E.',{exact:true})).toBeVisible();}
      if (platform === 'web') await page.getByRole('link',{name:kind === 'deneme' ? 'Deneme sınavları':'Ders sınavları',exact:true}).click();
      else await page.getByRole('tab',{name:kind === 'deneme' ? 'Deneme':'Ders',exact:true}).click();
      await page.getByRole('button',{name:'Sınava gir',exact:true}).click();
      if (platform === 'web') await page.getByLabel('Uygulamadan ayrılınca',{exact:true}).selectOption(pause ? 'pause_on_exit':'continuous');
      else await page.getByRole('button',{name:pause ? 'Çıkınca süre dursun':'Çıkınca süre devam etsin',exact:true}).click();
      const started=page.waitForResponse(r=>r.request().method()==='POST'&&/\/exam-attempts$/.test(new URL(r.url()).pathname));
      await page.getByRole('button',{name:'Sınavı başlat',exact:true}).click();
      const response=await started;const exam=(await response.json()).data;
      expect(exam.timer_policy).toBe(pause ? 'pause_on_exit':'continuous');
      await expect(page.getByRole('radio',{name:/Sentetik A/})).toBeEnabled();
      return exam;
    }
    const timerResponse=(page:Page,action:string)=>page.waitForResponse(r=>r.request().method()==='POST'&&r.url().endsWith('/timer')&&r.request().postDataJSON().action===action&&r.status()===200);
    async function leave(page:Page,kind:'deneme'|'ders') {
      if(platform==='web')await page.getByRole('link',{name:kind==='deneme'?'Deneme sınavları':'Ders sınavları',exact:true}).click();
      else await page.getByRole('button',{name:'Geri dön',exact:true}).click();
    }
    for(const kind of ['deneme','ders']as const) test(`${kind}: öğrenci çıkınca süreyi durdurur; geri dönünce süre ve kilitli cevap korunur`,async({page})=>{
      await page.clock.install();await start(page,kind,true);
      await page.getByRole('radio',{name:/Sentetik A/}).click();await expect(page.getByText('Cevaplar sunucuda kayıtlı',{exact:true})).toBeVisible();
      const paused=timerResponse(page,'pause');await leave(page,kind);const frozen=(await(await paused).json()).data;expect(frozen.timer_paused).toBe(true);
      const resumed=timerResponse(page,'resume');
      if(platform==='web')await page.locator('.sinav-row').getByRole('link',{name:'Devam et',exact:true}).click();
      else await page.getByRole('button',{name:'Devam et',exact:true}).click();
      const running=(await(await resumed).json()).data;expect(running.timer_paused).toBe(false);expect(running.remaining_seconds).toBe(frozen.remaining_seconds);
      await expect(page.getByText('Doğru yanıt. Doğru cevap: A. Yanıtın kaydedildi ve kilitlendi.',{exact:true})).toBeVisible();
      await expect(page.getByRole('radio',{name:/Sentetik A/})).toBeDisabled();
      const manual=timerResponse(page,'pause');await page.getByRole('button',{name:'Süreyi duraklat',exact:true}).click();await manual;
      await expect(page.getByText('Süre duraklatıldı.',{exact:true})).toBeVisible();
      const counter=page.getByLabel('Kalan süre',{exact:true}).first();const value=await counter.innerText();await page.clock.fastForward(5000);await expect(counter).toHaveText(value);
      mkdirSync('artifacts/exam-timer-choice',{recursive:true});await page.screenshot({path:`artifacts/exam-timer-choice/${platform}-${kind}-390.png`});
      await page.getByRole('button',{name:'Süreyi devam ettir',exact:true}).click();await expect(page.getByRole('button',{name:'Süreyi duraklat',exact:true})).toBeEnabled();
      if (platform === 'web') {
        const closing=timerResponse(page,'pause');await page.getByRole('button',{name:'Çıkış yap',exact:true}).click();
        expect((await(await closing).json()).data.timer_paused).toBe(true);
        await expect(page.getByLabel('E-posta adresi',{exact:true})).toBeVisible();
      }
    });
    test('öğrenci devam eden süreyi seçince çıkış duraklatma isteği göndermez',async({page})=>{
      const exam=await start(page,'deneme',false);let timerWrites=0;page.on('request',r=>{if(r.method()==='POST'&&r.url().endsWith('/timer'))timerWrites++;});
      await expect(page.getByRole('button',{name:'Süreyi duraklat',exact:true})).toHaveCount(0);await leave(page,'deneme');
      expect(exam.timer_paused).toBe(false);expect(timerWrites).toBe(0);
    });
  });
}
