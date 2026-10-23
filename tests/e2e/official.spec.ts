import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { browserTestEnv, phpBinary } from "../../playwright.config";

function fixture(operation: string) {
  return execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" }).trim();
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));

const admin = "http://127.0.0.1:5184";
const web = "http://127.0.0.1:5183";
const title = "Sentetik çıkmış sınav 2023";

async function adminLogin(page: Page) {
  await page.goto(`${admin}/deneme-sinavlari`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-admin@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları", exact: true })).toBeVisible();
}
async function studentLogin(page: Page) {
  await page.goto(`${web}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
}

test("yönetici çıkmış sınavı sıralayıp yayımlar; öğrenci orijinal sırayla çözer", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const errors: string[] = [];
  adminPage.on("pageerror", (error) => errors.push(error.message));
  await adminLogin(adminPage);
  await expect(adminPage.getByText("Henüz deneme sınavı yok")).toBeVisible();
  await adminPage.getByRole("link", { name: "Yeni deneme sınavı", exact: true }).first().click();
  // A new Deneme Sınavı opens with its exam type already chosen.
  await expect(adminPage.getByLabel("Sınav türü", { exact: true })).toHaveValue(/.+/);
  await adminPage.getByLabel("Sınav türü", { exact: true }).selectOption({ label: "Deneme Sınavı" });
  await adminPage.getByLabel("Silah durumu", { exact: true }).selectOption({ label: "Silahlı" });
  await adminPage.getByLabel("Başlık", { exact: true }).fill(title);
  await adminPage.getByLabel("Yıl", { exact: true }).fill("2023");
  await adminPage.getByLabel("Dönem", { exact: true }).fill("1. dönem");
  await adminPage.getByLabel("Sınav numarası", { exact: true }).fill("1");
  await adminPage.getByRole("button", { name: "Mevcut soruyu ekle", exact: true }).click();
  const dialog = adminPage.getByRole("dialog");
  for (const stem of ["Sentetik birinci soru", "Sentetik ikinci soru", "Sentetik üçüncü soru"]) {
    await dialog.getByRole("listitem").filter({ hasText: stem }).getByRole("button", { name: "Ekle", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Tamam", exact: true }).click();
  await adminPage.getByRole("button", { name: "3. soruyu yukarı taşı" }).click();
  await adminPage.getByRole("button", { name: "2. soruyu yukarı taşı" }).click();
  await adminPage.getByRole("button", { name: "Taslağı kaydet" }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: "Sınav taslağı oluşturuldu." })).toBeVisible();
  await adminPage.reload();
  await expect(adminPage.locator(".question-stem").first()).toHaveText("Sentetik üçüncü soru");

  // Drafts stay invisible to students.
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  student.on("pageerror", (error) => errors.push(error.message));
  await studentLogin(student);
  await expect(student.getByRole("heading", { name: "Henüz deneme sınavı yok" })).toBeVisible();

  await adminPage.getByRole("button", { name: "Yayımla", exact: true }).click();
  await adminPage.getByRole("dialog").getByRole("button", { name: "Yayımla", exact: true }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: "Çıkmış sınav yayımlandı." })).toBeVisible();
  await expect(adminPage.getByLabel("Başlık", { exact: true })).toBeDisabled();
  // The published exam shows every question below each other and a question is corrected in place:
  // the new version is published and the exam moves to it without changing the question's position.
  await expect(adminPage.locator(".question-card")).toHaveCount(3);
  // The number strip jumps to the question, focuses and highlights it; the floating button returns to the numbers.
  await adminPage.getByRole("button", { name: "3. soruya git", exact: true }).click();
  await expect(adminPage.locator("#soru-3")).toBeFocused();
  await expect(adminPage.locator("#soru-3")).toBeInViewport();
  await adminPage.getByRole("button", { name: "Numaralara dön", exact: true }).click();
  await expect(adminPage.locator("#soru-numaralari")).toBeInViewport();
  const third = adminPage.locator("#soru-3");
  await expect(third.locator(".question-stem")).toHaveText("Sentetik ikinci soru");
  await third.getByRole("button", { name: "Düzenle", exact: true }).click();
  await third.getByLabel("Soru metni", { exact: true }).fill("Sentetik ikinci soru (düzeltildi)");
  await third.getByRole("button", { name: "Kaydet, yayımla ve sınavda güncelle", exact: true }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: "3. soru kaydedildi, yayımlandı ve sınavda güncellendi." })).toBeVisible();
  await expect(third.locator(".question-stem")).toHaveText("Sentetik ikinci soru (düzeltildi)");
  await expect(third).toContainText("Sınavdaki sürüm 2");
  await adminPage.reload();
  await expect(adminPage.locator("#soru-3 .question-stem")).toHaveText("Sentetik ikinci soru (düzeltildi)");
  // The exam appears in the Deneme list; there is no Ders Sınavı yet.
  await adminPage.getByRole("link", { name: "Deneme sınavları", exact: true }).click();
  await expect(adminPage.getByRole("link", { name: `${title} sınavını aç` })).toContainText("3 soru");
  await adminPage.getByRole("link", { name: "Ders sınavları", exact: true }).click();
  await expect(adminPage.getByRole("heading", { name: "Ders sınavları", exact: true })).toBeVisible();
  await expect(adminPage.getByText("Henüz ders sınavı yok")).toBeVisible();
  await expect(adminPage.getByRole("link", { name: "Yeni ders sınavı" }).first()).toBeVisible();

  await student.reload();
  // The exam appears among the armed Deneme sınavları, not among the unarmed ones.
  await student.getByRole("button", { name: "Silahsız sınav" }).click();
  await expect(student.getByRole("heading", { name: "Henüz deneme sınavı yok" })).toBeVisible();
  await student.getByRole("button", { name: "Silahlı sınav" }).click();
  const row = student.locator(".sinav-row").filter({ hasText: "1. Deneme Sınavı" });
  await row.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await row.getByLabel("Süre (dakika)", { exact: true }).fill("5");
  await row.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(student.getByRole("heading", { name: "Denemen devam ediyor" })).toBeVisible();
  await expect(student.getByRole("heading", { name: "Sentetik üçüncü soru" })).toBeVisible();
  // A finished exam without a single answer is abandoned and never becomes a result, so one question is answered.
  await student.getByRole("radio", { name: /Sentetik A/ }).check();
  await student.getByRole("button", { name: "Sonraki soru" }).click();
  await expect(student.getByRole("heading", { name: "Sentetik birinci soru" })).toBeVisible();
  await student.getByRole("button", { name: "Denemeyi bitir", exact: true }).click();
  await student.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(student.getByRole("heading", { name: "Deneme sonucun" })).toBeVisible();
  // The result screen can add the shown question to the context favorites.
  await student.getByRole("button", { name: "☆ Favoriye ekle" }).first().click();
  await expect(student.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();
  await student.getByRole("link", { name: "Tekrar", exact: true }).click();
  await expect(student.locator(".sinav-row").filter({ hasText: "Favorilerim" })).toContainText("1 soru");
  await student.getByRole("link", { name: "Sonuçlarım", exact: true }).click();
  await expect(student.getByRole("heading", { name: title })).toBeVisible();
  expect(errors).toEqual([]);
  await adminContext.close();
  await studentContext.close();
});
