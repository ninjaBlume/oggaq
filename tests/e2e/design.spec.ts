import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { browserTestEnv, phpBinary } from "../../playwright.config";
import { contrastRatio, luminance } from "../../packages/design-tokens/src/contrast";

// Design rules of docs/DESIGN.md that must hold on every screen: light and dark follow the device and can be forced,
// nothing overflows from phone to desktop width, and text keeps AA contrast against what it sits on.
function fixture(operation: string) {
  execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" });
}
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); fixture("subject-exam"); fixture("favorite"); });
test.afterAll(() => fixture("cleanup"));

const web = "http://127.0.0.1:5183";
const admin = "http://127.0.0.1:5184";
const mobile = "http://127.0.0.1:5185";
const widths = [320, 390, 834, 1280];
const schemes = ["light", "dark"] as const;
const password = "Synthetic-Browser-42!";

const hex = (rgb: number[]) => `#${rgb.map((value) => value.toString(16).padStart(2, "0")).join("")}`;

// The colour a point on the page is really painted on: the first non-transparent background up the ancestors.
async function backgroundAt(page: Page, x: number, y: number) {
  return page.evaluate(([px, py]) => {
    for (let node = document.elementFromPoint(px, py); node; node = node.parentElement) {
      const match = getComputedStyle(node).backgroundColor.match(/rgba?\(([^)]+)\)/);
      const parts = match?.[1].split(/[ ,/]+/).map(Number) ?? [0, 0, 0, 0];
      if (parts.length < 4 || parts[3] > 0.99) return parts.slice(0, 3);
    }
    return [255, 255, 255];
  }, [x, y]);
}
async function expectFits(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
// The first heading's text colour against the surface under it.
async function expectHeadingContrast(page: Page) {
  const heading = page.getByRole("heading").first();
  const box = await heading.boundingBox();
  const color = await heading.evaluate((element) => getComputedStyle(element).color.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number));
  const background = await backgroundAt(page, Math.round(box!.x + 2), Math.round(box!.y + box!.height / 2));
  expect(contrastRatio(hex(color), hex(background))).toBeGreaterThanOrEqual(4.5);
}

async function webLogin(page: Page) {
  await page.goto(`${web}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
}

test("web: koyu tema cihazı izler, kullanıcı seçimi onu geçersiz kılar ve kalıcıdır", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "dark" });
  const page = await context.newPage();
  await webLogin(page);
  const paper = () => backgroundAt(page, 4, 300);
  expect(luminance(hex(await paper()))).toBeLessThan(0.05);
  await page.getByRole("radio", { name: "Açık", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  expect(luminance(hex(await paper()))).toBeGreaterThan(0.8);
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.getByRole("radio", { name: "Açık", exact: true })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Cihaz ayarı", exact: true }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", /.+/);
  expect(luminance(hex(await paper()))).toBeLessThan(0.05);
  await context.close();
});

for (const scheme of schemes) {
  test(`web (${scheme}): sayfalar 320–1280 px taşmaz ve başlık kontrastı AA`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await webLogin(page);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const name of ["Deneme sınavları", "Ders sınavları", "Sonuçlarım", "Tekrar sınavı", "Başarı durumum"]) {
        await page.getByRole("link", { name, exact: true }).click();
        await expect(page.getByRole("heading", { name: name === "Tekrar sınavı" ? /Tekrar/ : name }).first()).toBeVisible();
        await expectFits(page);
        await expectHeadingContrast(page);
      }
    }
    await context.close();
  });

  test(`admin (${scheme}): sınav listesi ve düzenleyici 320–1280 px taşmaz ve başlık kontrastı AA`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.goto(`${admin}/deneme-sinavlari`);
    await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-admin@example.test");
    await page.getByLabel("Parola", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Deneme sınavları", exact: true })).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const path of ["/deneme-sinavlari", "/ders-sinavlari", "/official-exams/new", "/catalogs"]) {
        // Client-side navigation: reloading the page 16 times would trip the API rate limit on the session check.
        await page.evaluate((to) => { history.pushState({}, "", to); dispatchEvent(new PopStateEvent("popstate")); }, path);
        await expect(page.getByRole("heading").first()).toBeVisible();
        await expectFits(page);
        await expectHeadingContrast(page);
      }
    }
    await context.close();
  });

  test(`mobil (${scheme}): sekmeler 320–1280 px taşmaz, genişte gezinme rayı vardır`, async ({ browser }) => {
    const context = await browser.newContext({ colorScheme: scheme });
    const page = await context.newPage();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${mobile}/`);
    await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
    await page.getByLabel("Parola", { exact: true }).fill(password);
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      for (const tab of ["Ana sayfa", "Deneme", "Ders", "Sonuçlar", "Profil"]) {
        await page.getByRole("tab", { name: tab, exact: true }).click();
        await page.waitForTimeout(500);
        await expectFits(page);
      }
      // Compact windows have the tab bar at the bottom, wider ones a rail at the left.
      const box = await page.getByRole("tab", { name: "Ders", exact: true }).boundingBox();
      if (width < 600) expect(box!.y).toBeGreaterThan(600);
      else expect(box!.x).toBeLessThan(100);
    }
    await context.close();
  });
}

test("mobil: Profil'den koyu görünüm seçilir ve açık cihazda uygulanır", async ({ browser }) => {
  const context = await browser.newContext({ colorScheme: "light" });
  const page = await context.newPage();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${mobile}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  expect(luminance(hex(await backgroundAt(page, 4, 400)))).toBeGreaterThan(0.8);
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Görünüm: Koyu", exact: true }).click();
  await expect.poll(async () => luminance(hex(await backgroundAt(page, 4, 400)))).toBeLessThan(0.05);
  await page.getByRole("tab", { name: "Ana sayfa", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  expect(luminance(hex(await backgroundAt(page, 4, 400)))).toBeLessThan(0.05);
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: "Görünüm: Cihaz ayarı", exact: true }).click();
  await expect.poll(async () => luminance(hex(await backgroundAt(page, 4, 400)))).toBeGreaterThan(0.8);
  await context.close();
});
