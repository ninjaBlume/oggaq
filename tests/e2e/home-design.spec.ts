import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { mobilePreviewUrl } from "../../playwright.config";
import { fixture } from "./student";

test.use({baseURL:mobilePreviewUrl, viewport:{width:390,height:844}});
test.beforeEach(() => {fixture("setup-study"); fixture("official-exam"); fixture("subject-exam");});
test.afterAll(() => fixture("cleanup"));
async function login(page: Page) {
 await page.goto("/");
 await page.getByLabel("E-posta adresi",{exact:true}).fill("e2e-student@example.test");
 await page.getByLabel("Parola",{exact:true}).fill("Synthetic-Browser-42!");
 await page.getByRole("button",{name:"Giriş yap",exact:true}).click();
 await expect(page.getByText("Merhaba, E2E.",{exact:true})).toBeVisible();
}
for (const colorScheme of ["light","dark"] as const) {
 test(`ana sayfa: gerçek özet, ücretsiz araçlar ve ${colorScheme} telefon/tablet düzeni`,async({page}) => {
  await page.emulateMedia({colorScheme});
  const response = page.waitForResponse(r => new URL(r.url()).pathname.endsWith("/stats"));
  await login(page);
  const {data} = await (await response).json();
  const summary = page.getByTestId("home-summary");
  await expect(summary.getByLabel(`Değerlendirilen soru: ${data.answers.total.toLocaleString("tr-TR")}`,{exact:true})).toBeVisible();
  await expect(summary.getByLabel(`Tamamlanan sınav: ${data.exams.completed.toLocaleString("tr-TR")}`,{exact:true})).toBeVisible();
  await expect(page.getByText("Tamamen ücretsiz",{exact:true})).toBeVisible();
  await expect(page.getByText(/\bPRO\b|premium|abonelik|yükselt|₺/i)).toHaveCount(0);
  for (const name of ["Ders sınavları ekranını aç","Tekrar sınavı ekranını aç","Sonuçlarım ekranını aç","Başarı durumum ekranını aç"]) {
   await expect(page.getByRole("button",{name,exact:true})).toBeEnabled();
  }
  mkdirSync("artifacts/home-reference",{recursive:true});
  for (const width of [320,390,834,1280]) {
   await page.setViewportSize({width,height:900});
   await page.getByRole("heading",{name:"Merhaba, E2E.",exact:true}).scrollIntoViewIfNeeded();
   expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
   await page.screenshot({path:`artifacts/home-reference/${colorScheme}-${width}-top.png`});
  }
  const quick = await page.getByRole("heading",{name:"Hızlı başla",exact:true}).boundingBox();
  const work = await page.getByRole("heading",{name:"Çalışmaların",exact:true}).boundingBox();
  expect(work!.x).toBeGreaterThan(quick!.x + 200);
  await page.getByRole("heading",{name:"Derslerini keşfet",exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`artifacts/home-reference/${colorScheme}-1280-lists.png`});
  await page.getByRole("button",{name:"Tekrar sınavı ekranını aç",exact:true}).click();
  await expect(page.getByRole("heading",{name:"Tekrar sınavı",exact:true})).toBeVisible();
 });
}
test("özet isteği yavaş veya hatalıyken ana eylem açık kalır; büyük yazı taşmaz",async({page}) => {
 await page.setViewportSize({width:320,height:900});
 await page.addInitScript(() => localStorage.setItem("oggaq.textSize","large"));
 let release!: () => void;
 const gate = new Promise<void>(resolve => {release=resolve;});
 let fail=true;
 await page.route("**/contexts/*/stats",async route => {
  if (fail) {await gate; await route.fulfill({status:503,contentType:"application/json",body:JSON.stringify({message:"Synthetic summary unavailable"})});}
  else await route.continue();
 });
 try {
  await login(page);
  await expect(page.getByTestId("home-focus").getByRole("button",{name:"Sınava gir",exact:true})).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 } finally {release();}
 await expect(page.getByRole("alert")).toContainText("Özet bilgilerin yüklenemedi");
 await expect(page.getByTestId("home-summary").getByText("—",{exact:true})).toHaveCount(3);
 fail=false;
 await page.getByRole("button",{name:"Yeniden dene",exact:true}).click();
 await expect(page.getByRole("alert")).toHaveCount(0);
 await expect(page.getByTestId("home-summary").getByLabel("Değerlendirilen soru: 0",{exact:true})).toBeVisible();
 await page.getByRole("heading",{name:"Merhaba, E2E.",exact:true}).scrollIntoViewIfNeeded();
 mkdirSync("artifacts/home-reference",{recursive:true});
 await page.screenshot({path:"artifacts/home-reference/light-320-large.png"});
});
