import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { answer, enterDeneme, finish, fixture, login } from "./student";

// "Soruyu bildir": a student reports a question from the result of a finished exam; the platform administrator reviews
// it in the Bildirimler queue (without ever seeing who reported), opens the exam at that question and closes the report.
// E2E_COLOR_SCHEME=dark renders the same flows in the dark theme (the screenshots in artifacts/report-preview).
const scheme = process.env.E2E_COLOR_SCHEME === "dark" ? "dark" : "light";
mkdirSync("artifacts/report-preview", { recursive: true });
test.use({ baseURL: "http://127.0.0.1:5183", colorScheme: scheme });
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); });
test.afterAll(() => fixture("cleanup"));

const admin = "http://127.0.0.1:5184";
const note = "E2E: cevap anahtarı yanlış görünüyor.";

async function adminLogin(page: Page) {
  await page.goto(`${admin}/bildirimler`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-admin@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Bildirimler", exact: true })).toBeVisible();
}

test("öğrenci sonuçtan soruyu bildirir; yönetici kuyrukta görür, sınavda açar ve kapatır", async ({ browser }) => {
  const errors: string[] = [];
  const studentContext = await browser.newContext({ colorScheme: scheme });
  const student = await studentContext.newPage();
  student.on("pageerror", (error) => errors.push(error.message));
  await login(student);
  await enterDeneme(student);
  // While the timer runs there is nothing to report.
  await expect(student.getByRole("button", { name: "Soruyu bildir" })).toHaveCount(0);
  await answer(student, "A");
  await finish(student);

  // The first question of the exam is "Sentetik üçüncü soru" (the fixture exam is in reverse order).
  await expect(student.getByRole("heading", { name: "Sentetik üçüncü soru" })).toBeVisible();
  await student.getByRole("button", { name: "Soruyu bildir", exact: true }).click();
  const send = student.getByRole("button", { name: "Bildirimi gönder", exact: true });
  await expect(send).toBeDisabled();
  await student.getByRole("radio", { name: "Cevap anahtarı yanlış", exact: true }).check();
  await student.getByLabel("Not (isteğe bağlı)").fill(note);
  await student.screenshot({ path: `artifacts/report-preview/web-form-${scheme}.png`, fullPage: true });
  await send.click();
  await expect(student.getByRole("status").filter({ hasText: "Bildirimin alındı, teşekkürler." })).toBeVisible();
  await expect(student.getByRole("button", { name: "Bildirdin", exact: true })).toBeDisabled();
  // The state comes from the server: a reload keeps it.
  await student.reload();
  await expect(student.getByRole("button", { name: "Bildirdin", exact: true })).toBeDisabled();

  const adminContext = await browser.newContext({ colorScheme: scheme });
  const page = await adminContext.newPage();
  page.on("pageerror", (error) => errors.push(error.message));
  await adminLogin(page);
  await expect(page.getByLabel("1 açık bildirim")).toBeVisible();
  const card = page.locator(".report-card").filter({ hasText: "Sentetik üçüncü soru" });
  await expect(card).toContainText("1 bildirim");
  await expect(card).toContainText("Cevap anahtarı yanlış · 1");
  await expect(card).toContainText(note);
  await expect(card).toContainText("Sentetik çalışma dersi");
  await page.screenshot({ path: `artifacts/report-preview/admin-queue-${scheme}.png`, fullPage: true });
  // Nobody can tell who reported.
  await expect(page.locator("main")).not.toContainText("e2e-student@example.test");
  await expect(page.locator("main")).not.toContainText("E2E öğrencisi");

  // The link opens the exam at the reported question.
  await card.getByRole("link", { name: /· 1\. soru$/ }).click();
  await expect(page).toHaveURL(/\/official-exams\/[0-9a-f-]+#soru-1$/);
  await expect(page.locator("#soru-1")).toBeInViewport();
  await expect(page.locator("#soru-1")).toBeFocused();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Bildirimler", exact: true })).toBeVisible();

  await card.getByRole("button", { name: "Düzeltildi", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Not (isteğe bağlı)").fill("Cevap anahtarı düzeltildi.");
  await page.screenshot({ path: `artifacts/report-preview/admin-dialog-${scheme}.png` });
  await dialog.getByRole("button", { name: "Düzeltildi olarak kapat", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "1 bildirim düzeltildi olarak kapatıldı." })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Açık bildirim yok" })).toBeVisible();
  await expect(page.getByLabel("1 açık bildirim")).toHaveCount(0);
  await page.getByRole("button", { name: /^Çözüldü/ }).click();
  const closed = page.locator(".report-card").filter({ hasText: "Sentetik üçüncü soru" });
  await expect(closed).toContainText("Düzeltildi");
  await expect(closed).toContainText("Cevap anahtarı düzeltildi.");
  await expect(closed.getByRole("button", { name: "Düzeltildi", exact: true })).toHaveCount(0);

  // With the report closed the student may report the question again.
  await student.reload();
  await expect(student.getByRole("button", { name: "Soruyu bildir", exact: true })).toBeVisible();
  expect(errors).toEqual([]);
  await studentContext.close();
  await adminContext.close();
});

test("rapor formu nedensiz gönderilmez; hata gösterilir ve vazgeçilebilir", async ({ page }) => {
  await login(page);
  await enterDeneme(page);
  await answer(page, "A");
  await finish(page);
  await page.getByRole("button", { name: "Soruyu bildir", exact: true }).click();
  await expect(page.getByRole("button", { name: "Bildirimi gönder", exact: true })).toBeDisabled();
  // A failing server answer is shown with a retry, and the form stays open.
  await page.route("**/report", (route) => route.fulfill({ status: 500, contentType: "application/problem+json", body: JSON.stringify({ title: "Server Error", status: 500, code: "server_error", detail: "Sunucu hatası" }) }));
  await page.getByRole("radio", { name: "Diğer", exact: true }).check();
  await page.getByRole("button", { name: "Bildirimi gönder", exact: true }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page.getByRole("button", { name: "Bildirdin" })).toHaveCount(0);
  await page.getByRole("button", { name: "Vazgeç", exact: true }).click();
  await expect(page.getByRole("button", { name: "Soruyu bildir", exact: true })).toBeVisible();
});

test.describe("mobil", () => {
  test.use({ baseURL: "http://127.0.0.1:5185", viewport: { width: 390, height: 844 }, colorScheme: scheme });

  test("öğrenci mobil sonuç ekranından soruyu bildirir", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/");
    await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
    await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
    await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
    await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Deneme", exact: true }).click();
    await page.getByRole("button", { name: "Sınava gir", exact: true }).click();
    await page.getByLabel("Süre (dakika)", { exact: true }).fill("5");
    await page.getByRole("button", { name: "Sınavı başlat" }).click();
    await expect(page.getByText("DENEMEN DEVAM EDİYOR", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Soruyu bildir", exact: true })).toHaveCount(0);
    await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
    await expect(page.getByText("Cevaplar sunucuda kayıtlı", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Denemeyi bitir", exact: true }).click();
    await page.getByRole("button", { name: "Bitir ve değerlendir" }).click();
    await expect(page.getByText("Deneme sonucun", { exact: true })).toBeVisible();

    await page.getByRole("button", { name: "Soruyu bildir", exact: true }).click();
    const send = page.getByRole("button", { name: "Bildirimi gönder", exact: true });
    await expect(send).toBeDisabled();
    await page.getByRole("radio", { name: "Yazım veya dil hatası", exact: true }).click();
    await page.getByLabel("Not (isteğe bağlı)").fill("E2E mobil not");
    await expect(page.getByText("13/500", { exact: true })).toBeVisible();
    await page.screenshot({ path: `artifacts/report-preview/mobile-sheet-${scheme}.png` });
    await send.click();
    await expect(page.getByText("Bildirimin alındı, teşekkürler.", { exact: true })).toBeVisible();
    await expect(page.getByText("Bildirdin", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Soruyu bildir", exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
});
