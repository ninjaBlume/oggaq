import { test, expect, type Page } from "@playwright/test";
import { mobilePreviewUrl } from "../../playwright.config";
import { fixture } from "./student";

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 844 } });
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); });
test.afterAll(() => fixture("cleanup"));
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  await page.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("137");
  await page.evaluate(() => {
    const state = window as unknown as { transientErrors: string[] };
    state.transientErrors = [];
    const collect = () => {
      for (const node of document.querySelectorAll('[role="alert"]')) {
        if (node.textContent?.includes("İşlem tamamlanamadı")) state.transientErrors.push(node.textContent);
      }
    };
    new MutationObserver(collect).observe(document.body, { childList: true, subtree: true });
  });
}
async function visibility(page: Page, state: "hidden" | "visible") {
  await page.evaluate(value => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value });
    document.dispatchEvent(new Event("visibilitychange"));
  }, state);
}
async function resume(page: Page) { await visibility(page, "hidden"); await visibility(page, "visible"); }

test("dönüşte tek geçici ağ hatası kırmızı uyarı üretmeden iyileşir ve form korunur", async ({ page }) => {
  await login(page);
  let me = 0; let contexts = 0;
  await page.route("**/api/v1/me", route => ++me === 1 ? route.abort("timedout") : route.continue());
  await page.route("**/api/v1/me/contexts", route => ++contexts === 1 ? route.abort("timedout") : route.continue());
  await resume(page);
  await expect.poll(() => me).toBe(2); await expect.poll(() => contexts).toBe(2);
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveValue("137");
  await expect(page.getByTestId("connection-notice")).toHaveCount(0);
  // An extra active notification is not another foreground transition.
  await visibility(page, "visible");
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  expect(me).toBe(2); expect(contexts).toBe(2);
  expect(await page.evaluate(() => (window as unknown as { transientErrors: string[] }).transientErrors)).toEqual([]);
});

test("kalıcı kesinti gezinmeyi sıfırlamaz; durum görünür, bağlantı gelince temizlenir", async ({ page }) => {
  await login(page);
  const fail = (route: import("@playwright/test").Route) => route.abort("internetdisconnected");
  await page.route("**/api/v1/me", fail); await page.route("**/api/v1/me/contexts", fail);
  await resume(page);
  await expect(page.getByTestId("connection-notice")).toHaveCount(1);
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveValue("137");
  await expect(page.getByText("Bağlantı yenilenemedi.", { exact: false })).toBeVisible();
  await page.unroute("**/api/v1/me", fail); await page.unroute("**/api/v1/me/contexts", fail);
  await resume(page);
  await expect(page.getByTestId("connection-notice")).toHaveCount(0);
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveValue("137");
  expect(await page.evaluate(() => (window as unknown as { transientErrors: string[] }).transientErrors)).toEqual([]);
});

test("arka planda iptal edilen eski zaman aşımı yeni başarılı oturuma uyarı eklemez", async ({ page }) => {
  await login(page); let release!: () => void; let arrived!: () => void; let first = true;
  const held = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { arrived = resolve; });
  await page.route("**/api/v1/me", async route => {
    if (!first) return route.continue();
    first = false; arrived(); await held;
    await route.fulfill({ status: 504, json: { detail: "Synthetic stale timeout" } });
  });
  await resume(page); await started;
  const failed = page.waitForEvent("requestfailed", request => new URL(request.url()).pathname === "/api/v1/me");
  await visibility(page, "hidden"); await failed;
  const refreshed = page.waitForResponse(response => new URL(response.url()).pathname === "/api/v1/me" && response.status() === 200);
  await visibility(page, "visible"); await refreshed; release();
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveValue("137");
  await expect(page.getByRole("alert")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { transientErrors: string[] }).transientErrors)).toEqual([]);
});

test("başarılı yetki yenilemesi erişimi kaldırır; eski bağlamla çalışmaya devam etmez", async ({ page }) => {
  await login(page);
  await page.route("**/api/v1/me/contexts", route => route.fulfill({ json: { data: [] } }));
  await resume(page);
  await expect(page.getByRole("heading", { name: "Sınavlarına erişilemiyor", exact: true })).toBeVisible();
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveCount(0);
});

test("dönüşte gerçekten süresi dolmuş hesap oturumu kapatılır", async ({ page }) => {
  await login(page);
  await page.route("**/api/v1/me", route => route.fulfill({ status: 401, json: { detail: "Synthetic expired session" } }));
  await resume(page);
  await expect(page.getByRole("button", { name: "Giriş yap", exact: true })).toBeVisible();
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveCount(0);
});
