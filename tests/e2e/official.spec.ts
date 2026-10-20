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
  await page.goto(`${admin}/official-exams`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-admin@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Sınavlar", exact: true })).toBeVisible();
}
async function studentLogin(page: Page) {
  await page.goto(`${web}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bugün ne çalışalım?" })).toBeVisible();
}

test("yönetici çıkmış sınavı sıralayıp yayımlar; öğrenci orijinal sırayla çözer", async ({ browser }) => {
  const adminContext = await browser.newContext();
  const adminPage = await adminContext.newPage();
  const errors: string[] = [];
  adminPage.on("pageerror", (error) => errors.push(error.message));
  await adminLogin(adminPage);
  await expect(adminPage.getByText("Henüz sınav yok")).toBeVisible();
  await adminPage.getByRole("link", { name: "Yeni sınav", exact: true }).click();
  await adminPage.getByLabel("Sınav türü", { exact: true }).selectOption({ label: "Deneme Sınavı" });
  await adminPage.getByLabel("Silah durumu", { exact: true }).selectOption({ label: "Silahlı" });
  await adminPage.getByLabel("Başlık", { exact: true }).fill(title);
  await adminPage.getByLabel("Yıl", { exact: true }).fill("2023");
  await adminPage.getByLabel("Dönem", { exact: true }).fill("1. dönem");
  await adminPage.getByLabel("Sınav numarası", { exact: true }).fill("1");
  await adminPage.getByRole("button", { name: "Soru ekle", exact: true }).click();
  const dialog = adminPage.getByRole("dialog");
  for (const stem of ["Sentetik birinci soru", "Sentetik ikinci soru", "Sentetik üçüncü soru"]) {
    await dialog.getByRole("listitem").filter({ hasText: stem }).getByRole("button", { name: "Ekle", exact: true }).click();
  }
  await dialog.getByRole("button", { name: "Tamam", exact: true }).click();
  await adminPage.getByRole("button", { name: "3. soruyu yukarı taşı" }).click();
  await adminPage.getByRole("button", { name: "2. soruyu yukarı taşı" }).click();
  await adminPage.getByRole("button", { name: "Taslağı kaydet" }).click();
  await expect(adminPage.getByRole("status").filter({ hasText: "Çıkmış sınav taslağı oluşturuldu." })).toBeVisible();
  await adminPage.reload();
  await expect(adminPage.locator(".question-stem").first()).toHaveText("Sentetik üçüncü soru");

  // Drafts stay invisible to students.
  const studentContext = await browser.newContext();
  const student = await studentContext.newPage();
  student.on("pageerror", (error) => errors.push(error.message));
  await studentLogin(student);
  await student.getByRole("link", { name: "Deneme", exact: true }).click();
  await student.getByRole("button", { name: "Çıkmış sınav", exact: true }).click();
  await expect(student.getByText("Henüz yayımlanmış çıkmış sınav yok.")).toBeVisible();

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
  // Subject based view: each question card names the exams that use it, next to its subject; the exam list shows the exam.
  await adminPage.goto(`${admin}/subjects`);
  await adminPage.getByRole("link", { name: "Sentetik çalışma dersi", exact: true }).click();
  await expect(adminPage.locator(".question-card").filter({ hasText: "Sentetik birinci soru" }).locator(".exam-tag")).toContainText("1. Deneme · silahlı");
  await expect(adminPage.locator(".question-card").filter({ hasText: "Sentetik" })).toHaveCount(3);
  // The subject also opens by exam: Deneme and Ders sections, then the exam number with this subject's questions.
  await adminPage.getByRole("button", { name: "Sınava göre", exact: true }).click();
  await expect(adminPage.getByRole("heading", { name: /^Deneme Sınavı/ })).toBeVisible();
  await expect(adminPage.getByRole("heading", { name: /^Ders Sınavı/ })).toBeVisible();
  await expect(adminPage.getByText("Bu dersin Ders Sınavı içinde sorusu yok.")).toBeVisible();
  await adminPage.getByRole("button", { name: /^1\. Deneme Sınavı/ }).click();
  await expect(adminPage.locator(".exam-section-body .question-card")).toHaveCount(3);
  await adminPage.getByRole("button", { name: "Konuya göre", exact: true }).click();
  await adminPage.goto(`${admin}/official-exams`);
  await expect(adminPage.getByRole("link", { name: `${title} sınavını aç` })).toContainText("3 soru");
  // Every exam type has a tab; the test data has no Ders Sınavı and says so.
  await adminPage.getByRole("button", { name: /^Ders Sınavı/ }).click();
  await expect(adminPage.getByText("Bu türde henüz sınav yok")).toBeVisible();
  await adminPage.getByRole("button", { name: /^Deneme Sınavı/ }).click();
  await expect(adminPage.getByRole("link", { name: `${title} sınavını aç` })).toBeVisible();

  await student.reload();
  await student.getByRole("button", { name: "Çıkmış sınav", exact: true }).click();
  // Exam type (Deneme/Ders) and armed/unarmed are separate filters.
  await student.getByLabel("Silah durumu", { exact: true }).selectOption({ label: "Silahsız" });
  await expect(student.getByText("Henüz yayımlanmış çıkmış sınav yok.")).toBeVisible();
  await student.getByLabel("Silah durumu", { exact: true }).selectOption({ label: "Silahlı" });
  await student.getByLabel("Sınav türü", { exact: true }).selectOption({ label: "Ders Sınavı" });
  await expect(student.getByText("Henüz yayımlanmış çıkmış sınav yok.")).toBeVisible();
  await student.getByLabel("Sınav türü", { exact: true }).selectOption({ label: "Deneme Sınavı" });
  await student.getByRole("radio", { name: new RegExp(title) }).check();
  await student.getByLabel("Süre (dakika)", { exact: true }).fill("5");
  await student.getByRole("button", { name: "Denemeyi başlat" }).click();
  await expect(student.getByRole("heading", { name: "Denemen devam ediyor" })).toBeVisible();
  await expect(student.getByRole("heading", { name: "Sentetik üçüncü soru" })).toBeVisible();
  await student.getByRole("button", { name: "Sonraki soru" }).click();
  await expect(student.getByRole("heading", { name: "Sentetik birinci soru" })).toBeVisible();
  await student.getByRole("button", { name: "Denemeyi bitir", exact: true }).click();
  await student.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(student.getByRole("heading", { name: "Deneme sonucun" })).toBeVisible();
  // The result screen can add the shown question to the context favorites.
  await student.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(student.getByRole("button", { name: "★ Favorilerde" })).toBeVisible();
  await student.getByRole("link", { name: "Tekrar", exact: true }).click();
  await student.getByRole("button", { name: "Favorilerim" }).click();
  await expect(student.locator(".question-card")).toHaveCount(1);
  await student.getByRole("link", { name: "Deneme", exact: true }).click();
  await student.getByRole("link", { name: "Deneme", exact: true }).click();
  await expect(student.getByRole("heading", { name: title })).toBeVisible();
  expect(errors).toEqual([]);
  await adminContext.close();
  await studentContext.close();
});
