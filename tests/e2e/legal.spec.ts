import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { browserTestEnv, phpBinary } from "../../playwright.config";
import { luminance } from "../../packages/design-tokens/src/contrast";
import { legalPages, notOfficialNotice, scoreEstimateNotice } from "../../packages/study-core/src/legal";

// Store readiness (docs/STORE_RELEASE.md): public legal pages, links from every client, and the "not an official app" notes.
function fixture(operation: string) {
  execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" });
}
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); fixture("subject-exam"); });
test.afterAll(() => fixture("cleanup"));

const web = "http://127.0.0.1:5183";
const mobile = "http://127.0.0.1:5185";
const password = "Synthetic-Browser-42!";
const hex = (rgb: number[]) => `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;

async function webLogin(page: Page) {
  await page.goto(`${web}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
}
async function expectLegalLinks(scope: ReturnType<Page["locator"]>) {
  const nav = scope.getByRole("navigation", { name: "Yasal sayfalar" });
  for (const page of legalPages) await expect(nav.getByRole("link", { name: page.title, exact: true })).toHaveAttribute("href", page.file);
}

test("herkese açık yasal sayfalar giriş yapmadan açılır; taslak bandı, işaretli alanlar ve bağlantılar vardır", async ({ page }) => {
  for (const legal of legalPages) {
    const response = await page.goto(`${web}${legal.file}`);
    expect(response?.status(), legal.file).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.locator("#taslak-bandi")).toContainText("TASLAK");
    expect(await page.locator("mark[data-placeholder]").count(), `${legal.file} yer tutucu`).toBeGreaterThan(0);
    for (const other of legalPages) await expect(page.locator("nav.site-nav").getByRole("link", { name: other.title, exact: true })).toHaveAttribute("href", other.file);
    await expect(page.getByRole("contentinfo")).toContainText(notOfficialNotice);
  }
  await page.goto(`${web}/legal/hesap-silme.html`);
  await expect(page.getByRole("main")).toContainText("Profil → Hesabım → Hesabı sil");
  await expect(page.getByRole("main")).toContainText("giriş yap → Hesabım → Hesabı sil");
  await expect(page.getByRole("link", { name: "Silme talebi gönder" })).toBeVisible();
  await page.goto(`${web}/legal/kosullar.html`);
  await expect(page.getByRole("main")).toContainText(scoreEstimateNotice);
  await page.goto(`${web}/legal/gizlilik.html`);
  await expect(page.getByRole("main")).toContainText("Reklam, analitik veya davranış takibi amacıyla veri toplamıyoruz");
});

for (const scheme of ["light", "dark"] as const) {
  test(`yasal sayfalar 320/390/834 px'te taşmaz ve ${scheme} temayı uygular`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    for (const width of [320, 390, 834]) {
      await page.setViewportSize({ width, height: 900 });
      for (const legal of legalPages) {
        await page.goto(`${web}${legal.file}`);
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${legal.file} @${width}`).toBe(true);
      }
    }
    const background = await page.evaluate(() => getComputedStyle(document.body).backgroundColor.match(/\d+/g)!.slice(0, 3).map(Number));
    if (scheme === "dark") expect(luminance(hex(background))).toBeLessThan(0.05);
    else expect(luminance(hex(background))).toBeGreaterThan(0.8);
    await context.close();
  });
}

test("web: giriş ve kayıt ekranında yasal bağlantılar, kayıt bildirimi ve resmî değildir notu; girişten sonra altbilgide", async ({ page }) => {
  await page.goto(`${web}/`);
  await expectLegalLinks(page.locator(".auth-content"));
  await expect(page.locator(".auth-content")).toContainText(notOfficialNotice);
  await expect(page.locator(".legal-consent")).toHaveCount(0);
  await page.getByRole("button", { name: "Hesap oluştur", exact: true }).click();
  const consent = page.locator(".legal-consent");
  await expect(consent).toContainText("Kayıt olarak Kullanım Koşulları’nı ve Gizlilik Politikası’nı okuduğunu kabul edersin.");
  await expect(consent.getByRole("link", { name: "Kullanım Koşulları" })).toHaveAttribute("href", "/legal/kosullar.html");
  await expect(consent.getByRole("link", { name: "Gizlilik Politikası" })).toHaveAttribute("href", "/legal/gizlilik.html");
  await webLogin(page);
  await expectLegalLinks(page.locator("footer.site-footer"));
  await expect(page.locator("footer.site-footer")).toContainText(notOfficialNotice);
  // The links open the static pages in a new tab and keep the app where it is.
  const [popup] = await Promise.all([page.context().waitForEvent("page"), page.locator("footer.site-footer").getByRole("link", { name: "Gizlilik Politikası", exact: true }).click()]);
  await popup.waitForLoadState();
  expect(new URL(popup.url()).pathname).toBe("/legal/gizlilik.html");
  await expect(popup.locator("#taslak-bandi")).toBeVisible();
  await popup.close();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
  // The score calculator says it is an estimate.
  await page.goto(page.url().replace(/\/deneme.*$/, "/score"));
  await expect(page.getByRole("heading", { name: "Puan hesapla" })).toBeVisible();
  await expect(page.getByText(scoreEstimateNotice, { exact: false }).first()).toBeVisible();
});

async function mobileLogin(page: Page) {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${mobile}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
}
// Linking.openURL on the web preview is window.open; record the target instead of opening a tab.
async function recordOpens(page: Page) {
  await page.addInitScript(() => { (window as unknown as { __opened: string[] }).__opened = []; window.open = ((url?: string | URL) => { (window as unknown as { __opened: string[] }).__opened.push(String(url)); return null; }) as typeof window.open; });
}
const opened = (page: Page) => page.evaluate(() => (window as unknown as { __opened: string[] }).__opened);

test("mobil: giriş ve kayıt ekranında yasal bağlantılar; Profil → Yasal ve destek doğru adresleri açar", async ({ page }) => {
  await recordOpens(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${mobile}/`);
  for (const legal of legalPages) await expect(page.getByRole("link", { name: `${legal.title} sayfasını aç`, exact: true })).toBeVisible();
  await expect(page.getByText("Kayıt olarak", { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "Hesap oluştur", exact: true }).first().click();
  await expect(page.getByText("Kayıt olarak", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Gizlilik Politikası sayfasını aç", exact: true }).click();
  expect((await opened(page)).at(-1)).toMatch(/^https?:\/\/.+\/legal\/gizlilik\.html$/);

  await mobileLogin(page);
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await expect(page.getByText("Yasal ve destek", { exact: true })).toBeVisible();
  await expect(page.getByText(notOfficialNotice, { exact: true })).toBeVisible();
  for (const legal of legalPages) {
    await page.getByRole("link", { name: `${legal.title} sayfasını aç`, exact: true }).click();
    expect((await opened(page)).at(-1), legal.id).toMatch(new RegExp(`^https?://.+${legal.file.replace(/[.]/g, "\\.")}$`));
  }
});

test("mobil: Yasal ve destek bölümü 320/390/834 px'te taşmaz", async ({ page }) => {
  await mobileLogin(page);
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByText("Yasal ve destek", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `@${width}`).toBe(true);
  }
});
