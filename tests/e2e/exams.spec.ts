import { test, expect } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { answer, enterDeneme, finish, fixture, login } from "./student";

test.use({ baseURL: "http://127.0.0.1:5183" });
test.beforeEach(() => { fixture("setup-study"); fixture("official-exam"); });
test.afterAll(() => fixture("cleanup"));

test("sınav cevapları saklanır; bitişte doğru yanlış boş ve kaynak açıklaması gösterilir", async ({ page }) => {
  await login(page);
  await enterDeneme(page, "1");
  await expect(page.getByText("Sentetik açıklama", { exact: false })).toHaveCount(0);
  await answer(page, "A");
  await page.getByRole("button", { name: "Sonraki soru" }).click();
  await answer(page, "B");
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Sentetik A/ })).toBeChecked();
  await finish(page);
  await expect(page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" })).toContainText("1 doğru · 1 yanlış · 1 boş");
  await expect(page.getByText("Sentetik açıklama — gerçek sınav içeriği değildir.", { exact: true })).toBeVisible();
  mkdirSync("artifacts/web-preview", { recursive: true });
  await page.screenshot({ path: "artifacts/web-preview/exam-result.png", fullPage: true });
  await page.getByRole("link", { name: "Sonuçlarıma dön", exact: false }).click();
  await page.getByRole("region", { name: "Sınav sonuçları" }).getByRole("link").click();
  await expect(page).toHaveURL(url);
  await expect(page.getByRole("heading", { name: "Deneme sonucun" })).toBeVisible();
});

test("süre sunucuda dolar ve tarayıcı otomatik sonucu getirir", async ({ page }) => {
  await login(page);
  await page.goto(fixture("near-deadline"));
  await expect(page.getByRole("heading", { name: "Deneme sonucun" })).toBeVisible({ timeout: 20000 });
  await expect(page.getByText("Süre dolduğunda tamamlandı.", { exact: false })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" })).toContainText("3 boş");
});

test("kaybolan cevap yanıtı aynı işlemle tekrar edilir ve tek cevap kalır", async ({ page }) => {
  await login(page);
  await enterDeneme(page);
  let lost = false;
  await page.route("**/exam-attempts/*/answers/*", async (route) => {
    if (!lost) { lost = true; await route.fetch(); await route.abort("internetdisconnected"); }
    else await route.continue();
  });
  await page.getByRole("radio", { name: /Sentetik A/ }).check();
  await expect(page.getByRole("alert")).toContainText("Sunucuya ulaşılamıyor");
  await expect(page.getByRole("radio", { name: /Sentetik B/ })).toBeDisabled();
  await page.getByRole("button", { name: "Yeniden dene" }).click();
  await expect(page.getByText("Cevaplar sunucuda kayıtlı", { exact: true })).toBeVisible();
  await finish(page);
  await expect(page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" })).toContainText("1 doğru · 0 yanlış · 2 boş");
});

test("eski sekme diğer cevabı ezemez; güncel kayıtla devam eder", async ({ page }) => {
  await login(page);
  await enterDeneme(page);
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(other.getByRole("heading", { name: "Denemen devam ediyor" })).toBeVisible();
  await answer(page, "A");
  await other.getByRole("radio", { name: /Sentetik B/ }).check();
  await expect(other.getByRole("alert")).toContainText("Deneme başka bir işlemde güncellendi.");
  await other.getByRole("button", { name: "Güncel kaydı yükle" }).click();
  await expect(other.getByRole("radio", { name: /Sentetik A/ })).toBeChecked();
  await other.close();
});

test("geçersiz süre ile sınav başlatılamaz", async ({ page }) => {
  await login(page);
  let started = false;
  await page.route("**/contexts/*/exam-attempts", async (route) => {
    if (route.request().method() === "POST") started = true;
    await route.continue();
  });
  const row = page.locator(".sinav-row").filter({ hasText: "1. Deneme Sınavı" });
  await row.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await row.getByLabel("Süre (dakika)", { exact: true }).fill("0");
  await row.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
  await expect(row.getByLabel("Süre (dakika)", { exact: true })).toHaveJSProperty("validity.valid", false);
  expect(started).toBe(false);
  // The suggested duration of a full armed exam is the official 150 minutes, which the server accepts.
  await row.getByLabel("Süre (dakika)", { exact: true }).fill("150");
  await row.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(page.getByRole("heading", { name: "Denemen devam ediyor" })).toBeVisible();
});
