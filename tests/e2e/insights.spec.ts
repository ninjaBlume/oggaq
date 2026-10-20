import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { answer, enterDers, enterReview, finish, fixture, login } from "./student";

test.use({ baseURL: "http://127.0.0.1:5183" });
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); fixture("subject-exam"); });
test.afterAll(() => fixture("cleanup"));

// The Ders Sınavı holds the three questions in order: first answer b (wrong), second blank, third a (correct), unless told otherwise.
async function solveDers(page: Page, first: "A" | "B") {
  await enterDers(page);
  await answer(page, first);
  await page.getByRole("button", { name: "Sonraki soru" }).click();
  await page.getByRole("button", { name: "Sonraki soru" }).click();
  await answer(page, "A");
  await finish(page);
}

test("yanlışlar, boşlar, favoriler ve başarı durumu son sonuca göre güncellenir", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await login(page);
  await solveDers(page, "B");
  await expect(page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" })).toContainText("1 doğru · 1 yanlış · 1 boş");
  // The result shows one question at a time; go back to the first (wrong) one before favoriting it.
  await page.getByRole("button", { name: "Önceki soru" }).click();
  await page.getByRole("button", { name: "Önceki soru" }).click();
  await expect(page.getByRole("heading", { name: "Sentetik birinci soru" })).toBeVisible();
  await page.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(page.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();

  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tekrar sınavı" })).toBeVisible();
  const list = (name: string) => page.locator(".sinav-row").filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(list("Yanlışlarım")).toContainText("1 soru");
  await expect(list("Boş bıraktıklarım")).toContainText("1 soru");
  await expect(list("Favorilerim")).toContainText("1 soru");
  // The favorite list yields an exam with exactly the favorite question.
  await enterReview(page, "Favorilerim");
  await expect(page.getByRole("heading", { name: "Sentetik birinci soru" })).toBeVisible();
  await expect(page.getByText("Soru 1 / 1", { exact: false })).toBeVisible();
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(list("Favorilerim")).toContainText("1 soru");

  // Timestamps have second precision; the corrected answer must be the latest one.
  await page.waitForTimeout(1100);
  await solveDers(page, "A");
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByText("Şu an tekrar edeceğin yanlış soru yok.")).toBeVisible();

  await page.getByRole("link", { name: "Başarım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Başarı durumum" })).toBeVisible();
  // Two attempts: (correct, wrong, blank, correct... counted per attempt) = 3 correct, 1 wrong, 2 blank.
  await expect(page.getByText("3 doğru · 1 yanlış · 2 boş").first()).toBeVisible();
  await expect(page.getByRole("img", { name: /Sentetik çalışma dersi: 3 doğru, 1 yanlış, 2 boş/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test("deneme ve ders sınavları ayrı listelenir", async ({ page }) => {
  await login(page);
  // The Deneme list has the whole exam only, the Ders list has the subject exam only.
  await expect(page.locator(".sinav-row")).toHaveCount(1);
  await expect(page.locator(".sinav-row")).toContainText("1. Deneme Sınavı");
  await page.getByRole("link", { name: "Ders sınavları", exact: true }).click();
  await expect(page.locator(".sinav-row")).toHaveCount(1);
  await expect(page.locator(".sinav-row")).toContainText("1. Ders Sınavı");
});

test("kişisel ve kurum alanlarının tekrar listeleri ayrıdır", async ({ page }) => {
  await login(page);
  await solveDers(page, "B");
  await page.getByLabel("Çalışma alanı", { exact: true }).selectOption({ label: "Sentetik eğitim kurumu" });
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(page.getByText("Şu an tekrar edeceğin yanlış soru yok.")).toBeVisible();
  await page.getByRole("link", { name: "Başarım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Henüz istatistik yok" })).toBeVisible();
});
