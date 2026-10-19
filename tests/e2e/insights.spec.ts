import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { browserTestEnv, phpBinary } from "../../playwright.config";

test.use({ baseURL: "http://127.0.0.1:5183" });
function fixture(operation: string) {
  return execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" }).trim();
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));
async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bugün ne çalışalım?" })).toBeVisible();
}
async function solve(page: Page, name: string, answer: "A" | "B" | null) {
  await page.getByRole("link", { name: "Soru çöz", exact: true }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Soruyu çöz" }).click();
  await expect(page.getByRole("heading", { name: "Bir soru, bir adım" })).toBeVisible();
  if (answer) {
    await page.getByRole("radio", { name: new RegExp(`Sentetik ${answer}`) }).check();
    await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  } else {
    await page.getByRole("button", { name: "Boş bırak" }).click();
    await page.getByRole("button", { name: "Boş olarak kaydet" }).click();
  }
  await expect(page.getByRole("heading", { name: "Çözümünü incele" })).toBeVisible();
}

test("yanlışlar, boşlar, favoriler ve başarı durumu son sonuca göre güncellenir", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await solve(page, "Sentetik birinci soru", "B");
  await page.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(page.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();
  await solve(page, "Sentetik ikinci soru", null);

  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tekrar listelerim" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sentetik birinci soru", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sentetik ikinci soru", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Boş bıraktıklarım" }).click();
  await expect(page.getByRole("heading", { name: "Sentetik ikinci soru", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Favorilerim" }).click();
  await expect(page.getByRole("heading", { name: "Sentetik birinci soru", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "★ Favorilerden çıkar" }).click();
  await expect(page.getByRole("heading", { name: "Henüz favori soru eklemedin." })).toBeVisible();

  // Timestamps have second precision; the corrected answer must be the latest one.
  await page.waitForTimeout(1100);
  await solve(page, "Sentetik birinci soru", "A");
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Şu an tekrar edeceğin yanlış soru yok." })).toBeVisible();

  await page.getByRole("link", { name: "Başarım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Başarı durumum" })).toBeVisible();
  await expect(page.getByText("1 doğru · 1 yanlış · 1 boş").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Sentetik çalışma dersi: 1 doğru, 1 yanlış, 1 boş/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("soru dersi ve çıkmış sınavları ayrı gösterir; sınava ve derse göre filtrelenir", async ({ page }) => {
  fixture("official-exam");
  await login(page);
  const card = (name: string) => page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card("Sentetik birinci soru")).toContainText("Ders: Sentetik çalışma dersi");
  await expect(card("Sentetik birinci soru")).toContainText("Sınav: 1. Temel · silahlı");
  await expect(card("Sınavda olmayan sentetik soru")).toContainText("Sınav: Çıkmış sınavlarda yok");
  await expect(card("Sınavda olmayan sentetik soru")).toContainText("Ders: Sentetik çalışma dersi");
  await page.getByLabel("Çıkmış sınav", { exact: true }).selectOption({ label: "Sentetik çıkmış sınav" });
  await expect(page.locator("article")).toHaveCount(3);
  await expect(page.getByRole("heading", { name: "Sınavda olmayan sentetik soru", exact: true })).toHaveCount(0);
  await page.getByLabel("Ders", { exact: true }).selectOption({ label: "Sentetik çalışma dersi" });
  await expect(page.locator("article")).toHaveCount(3);
  await card("Sentetik üçüncü soru").getByRole("button", { name: "Soruyu çöz" }).click();
  await expect(page.getByRole("heading", { name: "Bir soru, bir adım" })).toBeVisible();
  await expect(page.locator(".question-meta")).toContainText("Ders: Sentetik çalışma dersi");
  await expect(page.getByLabel("Çıkmış sınavlar")).toContainText("1. Temel · silahlı");
});

test("kişisel ve kurum alanlarının tekrar listeleri ayrıdır", async ({ page }) => {
  await login(page);
  await solve(page, "Sentetik birinci soru", "B");
  await page.getByLabel("Çalışma alanı", { exact: true }).selectOption({ label: "Sentetik eğitim kurumu" });
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Şu an tekrar edeceğin yanlış soru yok." })).toBeVisible();
  await page.getByRole("link", { name: "Başarım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Henüz istatistik yok" })).toBeVisible();
});
