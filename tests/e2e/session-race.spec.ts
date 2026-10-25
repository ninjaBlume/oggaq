import { test, expect, type Page } from "@playwright/test";
import { mobilePreviewUrl } from "../../playwright.config";
import { fixture } from "./student";

test.use({ baseURL: mobilePreviewUrl, viewport: { width: 390, height: 844 } });
test.beforeEach(() => {
  fixture("setup-study");
  fixture("disposable-user", "e2e-new-session@example.test");
});
test.afterAll(() => fixture("cleanup"));

async function login(page: Page, email: string) {
  await page.getByLabel("E-posta adresi", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
}

for (const status of [200, 401, 403]) {
  test(`eski mobil oturumun geciken /me ${status} yanıtı yeni hesabı değiştirmez`, async ({ page }) => {
    await page.goto("/");
    await login(page, "e2e-student@example.test");
    let release!: () => void;
    let received!: () => void;
    const gate = new Promise<void>((resolve) => { release = resolve; });
    const started = new Promise<void>((resolve) => { received = resolve; });
    let held = false;
    await page.route("**/api/v1/me", async (route) => {
      if (held || route.request().method() !== "GET") return route.continue();
      held = true;
      const original = await route.fetch();
      received();
      await gate;
      if (status === 200) await route.fulfill({ response: original });
      else await route.fulfill({ status, json: { message: "Eski oturum artık geçerli değil." } });
    });
    // React Native Web implements the same AppState callback through visibilitychange.
    await page.evaluate(() => {
      for (const state of ["hidden", "visible"]) {
        Object.defineProperty(document, "visibilityState", { configurable: true, value: state });
        document.dispatchEvent(new Event("visibilitychange"));
      }
    });
    await started;
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await page.getByRole("button", { name: "Çıkış yap", exact: true }).click();
    await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
    await login(page, "e2e-new-session@example.test");
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await expect(page.getByText("e2e-new-session@example.test", { exact: true })).toBeVisible();
    const finished = page.waitForResponse((response) => response.url().endsWith("/api/v1/me") && response.status() === status);
    release();
    await (await finished).finished();
    // A turn through the UI ensures the response's state updates have been rendered.
    await page.getByRole("tab", { name: "Ana sayfa", exact: true }).click();
    await page.getByRole("tab", { name: "Profil", exact: true }).click();
    await expect(page.getByText("e2e-new-session@example.test", { exact: true })).toBeVisible();
    await expect(page.getByText("e2e-student@example.test", { exact: true })).toHaveCount(0);
  });
}
