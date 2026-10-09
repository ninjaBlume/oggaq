import { test, expect } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { browserTestEnv, phpBinary } from "../../playwright.config";
test.use({
  baseURL: "http://127.0.0.1:5185",
  viewport: { width: 390, height: 844 },
});
function fixture(op: string) {
  execFileSync(phpBinary, ["scripts/e2e-fixtures.php", op], {
    env: browserTestEnv,
    stdio: "pipe",
  });
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));
test("Expo ekranları gerçek Bearer API ile soru, deneme ve geçmiş akışını tamamlar", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let bearerSeen = false;
  page.on("request", (r) => {
    if (
      r.url().includes("/api/v1/me/contexts") &&
      r.headers()["authorization"]?.startsWith("Bearer ")
    )
      bearerSeen = true;
  });
  await page.goto("/");
  await page
    .getByLabel("E-posta adresi", { exact: true })
    .fill("e2e-student@example.test");
  await page
    .getByLabel("Parola", { exact: true })
    .fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByText("Bugün ne çalışalım?", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Soruyu çöz", exact: true })
    .first()
    .click();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  await expect(page.getByText("Doğru", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await expect(
    page.getByRole("button", { name: "Sonucu incele" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Deneme", exact: true }).click();
  await page.getByLabel("Soru sayısı", { exact: true }).fill("3");
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Denemeyi başlat" }).click();
  await expect(
    page.getByText("Denemen devam ediyor", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await expect(
    page.getByText("Cevaplar sunucuda kayıtlı", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Denemeyi bitir", exact: true })
    .click();
  await page.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(page.getByText("Deneme sonucun", { exact: true })).toBeVisible();
  await expect(
    page.getByText("1 doğru · 0 yanlış · 2 boş", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Bitir ve değerlendir" }),
  ).not.toBeVisible();
  mkdirSync("artifacts/mobile-preview", { recursive: true });
  await page.screenshot({
    path: "artifacts/mobile-preview/exam-result.png",
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(bearerSeen).toBe(true);
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("mobil önizleme yenilenince kalıcı olmayan token yeniden giriş gerektirir", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByLabel("E-posta adresi", { exact: true })
    .fill("e2e-student@example.test");
  await page
    .getByLabel("Parola", { exact: true })
    .fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByText("Bugün ne çalışalım?", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
});
