import { test, expect, type Page, type Locator } from "@playwright/test";
import { mobilePreviewUrl } from "../../playwright.config";
import { fixture } from "./student";
import { mkdirSync } from "node:fs";

test.use({baseURL:mobilePreviewUrl, viewport:{width:390,height:844}});
test.beforeEach(() => {fixture("setup-study"); fixture("official-exam");});
test.afterAll(() => fixture("cleanup"));
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-posta adresi",{exact:true}).fill("e2e-student@example.test");
  await page.getByLabel("Parola",{exact:true}).fill("Synthetic-Browser-42!");
  await page.getByRole("button",{name:"Giriş yap",exact:true}).click();
  await page.getByRole("tab",{name:"Profil",exact:true}).click();
}
const fontSize = (element: Locator) => element.evaluate(node => parseFloat(getComputedStyle(node).fontSize));
for (const colorScheme of ["light", "dark"] as const) {
 test(`yazı boyutu: üç kademe, ${colorScheme} tema, telefon/tablet ve kalıcılık`, async ({page}) => {
  await page.addInitScript(value => localStorage.setItem('oggaq.theme', value), colorScheme);
  await page.emulateMedia({colorScheme}); await login(page);
  const sample = page.getByText("Örnek metin: Soruları ve seçenekleri rahatça oku.",{exact:true});
  for (const [label, value, font] of [["Küçük","small",15.3],["Standart","standard",17],["Büyük","large",20.4]] as const) {
   await page.getByRole("button",{name:`Yazı boyutu: ${label}`,exact:true}).click();
   await expect.poll(() => fontSize(sample)).toBeCloseTo(font,1);
   await expect(page.getByRole("button",{name:`Yazı boyutu: ${label}`,exact:true})).toHaveAttribute("aria-selected","true");
   await expect.poll(() => page.evaluate(() => localStorage.getItem("oggaq.textSize"))).toBe(value);
  }
  for (const width of [320,390,834,1280]) {
   await page.setViewportSize({width,height:900});
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   await expect(page.getByRole("button",{name:"Yazı boyutu: Büyük",exact:true})).toBeVisible();
   await page.getByRole("button",{name:"Yazı boyutu: Büyük",exact:true}).scrollIntoViewIfNeeded();
   mkdirSync("artifacts/text-size",{recursive:true});
   await page.screenshot({path:`artifacts/text-size/${colorScheme}-${width}-large.png`});
  }
  await page.reload();
  await expect.poll(() => fontSize(page.getByLabel("E-posta adresi",{exact:true}))).toBeCloseTo(19.2,1);
 });
}
test("boyut değişimi açık sınav formunu ve kaldığı soruyu korur", async ({page}) => {
 await login(page);
 await page.getByRole("tab",{name:"Deneme",exact:true}).click();
 await page.getByRole("button",{name:"Sınava gir",exact:true}).click();
 await page.getByLabel("Süre (dakika)",{exact:true}).fill("120");
 await page.getByRole("tab",{name:"Profil",exact:true}).click();
 await page.getByRole("button",{name:"Yazı boyutu: Büyük",exact:true}).click();
 await page.getByRole("tab",{name:"Deneme",exact:true}).click();
 await expect(page.getByLabel("Süre (dakika)",{exact:true})).toHaveValue("120");
 await page.getByRole("button",{name:"Sınavı başlat",exact:true}).click();
 const stem = page.getByText("Sentetik üçüncü soru",{exact:true});
 await expect(stem).toBeVisible(); await expect.poll(() => fontSize(stem)).toBeCloseTo(25.2,1);
 await expect(page.getByTestId("exam-header-title")).toHaveText("Sentetik çıkmış sınav");
 await expect.poll(() => fontSize(page.getByTestId("exam-header-title"))).toBeCloseTo(16.8,1);
 await page.getByRole("radio",{name:/Sentetik A/}).click();
 await expect(page.getByText(/Yanıtın kaydedildi ve kilitlendi\./)).toBeVisible();
 const position = page.waitForResponse(response => new URL(response.url()).pathname.endsWith("/position"));
 await page.getByRole("button",{name:"Sonraki soru",exact:true}).click(); await position;
 await page.getByRole("button",{name:"Geri dön",exact:true}).click();
 await page.getByRole("tab",{name:"Profil",exact:true}).click();
 await page.getByRole("button",{name:"Yazı boyutu: Küçük",exact:true}).click();
 await page.getByRole("tab",{name:"Deneme",exact:true}).click();
 await page.getByRole("button",{name:"Devam et",exact:true}).click();
 await expect(page.getByText("Soru 2 / 3",{exact:true})).toBeVisible();
 await page.getByRole("button",{name:"Önceki soru",exact:true}).click();
 await expect(page.getByRole("radio",{name:/Sentetik A/})).toBeChecked();
});
test("kaydetme hatası boyutu geri almaz; yeniden deneme tercihi saklar", async ({page}) => {
 await page.addInitScript(() => {
  const original = Storage.prototype.setItem;
  (window as unknown as {failSizeWrite:boolean}).failSizeWrite = true;
  Storage.prototype.setItem = function(key,value) {
   if (key === "oggaq.textSize" && (window as unknown as {failSizeWrite:boolean}).failSizeWrite) throw new Error("Synthetic storage failure");
   return original.call(this,key,value);
  };
 });
 await login(page); await page.getByRole("button",{name:"Yazı boyutu: Büyük",exact:true}).click();
 await expect(page.getByRole("alert")).toContainText("Yazı boyutu tercihi saklanamadı");
 await expect.poll(() => fontSize(page.getByText("Örnek metin: Soruları ve seçenekleri rahatça oku.",{exact:true}))).toBeCloseTo(20.4,1);
 await page.evaluate(() => {(window as unknown as {failSizeWrite:boolean}).failSizeWrite = false;});
 await page.getByRole("button",{name:"Yeniden dene",exact:true}).click();
 await expect.poll(() => page.evaluate(() => localStorage.getItem("oggaq.textSize"))).toBe("large");
 await expect(page.getByRole("alert")).toHaveCount(0);
});
