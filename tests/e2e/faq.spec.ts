import { test, expect, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { mobilePreviewUrl } from "../../playwright.config";
import { fixture } from "./student";
import { notOfficialNotice } from "../../packages/study-core/src/legal";

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 844 } });
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));

async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("button", { name: "Menüyü aç", exact: true })).toBeVisible();
}
async function openFaq(page: Page) {
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Sıkça Sorulan Sorular", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sıkça Sorulan Sorular", exact: true })).toBeVisible();
}

for (const colorScheme of ["light", "dark"] as const) {
  test(`SSS: menü, klavye, tek açık yanıt ve büyük yazıda telefon/tablet — ${colorScheme}`, async ({ page }) => {
    await page.addInitScript(value => localStorage.setItem('oggaq.theme', value), colorScheme);
    await page.emulateMedia({ colorScheme });
    await login(page);
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Yazı boyutu: Büyük", exact: true }).click();
    await expect(page.getByText("Yasal ve destek", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Gizlilik Politikası sayfasını aç", exact: true })).toBeVisible();
    await openFaq(page);
    const first = page.getByRole("button", { name: "Sorular çıkmış sınav soruları mı?", exact: true });
    await first.focus(); await page.keyboard.press("Enter");
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByTestId("faq-answer-sources")).toBeVisible();
    const next = page.getByRole("button", { name: "Uygulamadan çıkınca süre durur mu?", exact: true });
    await next.click();
    await expect(first).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByTestId("faq-answer-sources")).toHaveCount(0);
    await expect(page.getByTestId("faq-answer-timer")).toContainText("Buna sınava başlarken sen karar verirsin");
    await next.click(); await expect(next).toHaveAttribute("aria-expanded", "false");
    await first.click();
    mkdirSync("artifacts/faq", { recursive: true });
    for (const width of [320, 390, 834]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `@${width}`).toBe(true);
      await first.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `artifacts/faq/${colorScheme}-${width}.png` });
    }
    await expect(page.getByText(notOfficialNotice, { exact: true })).toBeVisible();
    // Static help remains usable without making a new API request.
    await page.context().setOffline(true);
    await page.getByRole("button", { name: "İnternet olmadan soru çözebilir miyim?", exact: true }).click();
    await expect(page.getByTestId("faq-answer-connection")).toContainText("internet bağlantısı gerekir");
    await page.context().setOffline(false);
  });
}

test("SSS: destek hatası görünür ve tekrar denenir; gizlilik ve hesap silme adresleri korunur", async ({ page }) => {
  await page.addInitScript(() => {
    const state = window as unknown as { opened: string[]; failOpen: boolean };
    state.opened = []; state.failOpen = true;
    window.open = ((url?: string | URL) => {
      if (state.failOpen) throw new Error("Synthetic mail application failure");
      state.opened.push(String(url)); return null;
    }) as typeof window.open;
  });
  await login(page); await openFaq(page);
  await page.getByRole("button", { name: "Destek ekibine yaz", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("E-posta uygulaması açılamadı");
  await page.evaluate(() => { (window as unknown as { failOpen: boolean }).failOpen = false; });
  await page.getByRole("button", { name: "Yeniden dene", exact: true }).click();
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened.at(-1))).toBe("mailto:destek@oggsor.com");
  for (const [name, path] of [["Gizlilik Politikası", "gizlilik"], ["Hesap silme", "hesap-silme"]]) {
    await page.getByRole("link", { name: `${name} sayfasını aç`, exact: true }).click();
    expect(await page.evaluate(() => (window as unknown as { opened: string[] }).opened.at(-1))).toMatch(new RegExp(`/legal/${path}\\.html$`));
  }
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Hesabım: e-posta, parola, cihazlar, verilerin, hesabı sil", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hesabı sil", exact: true })).toBeVisible();
});
