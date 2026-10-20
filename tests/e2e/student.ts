import { expect } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { browserTestEnv, phpBinary } from "../../playwright.config";

// Shared steps of the student web app: the student enters a Deneme or Ders Sınavı and solves it.
export function fixture(operation: string, email?: string) {
  return execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation, ...(email ? [email] : [])], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" }).trim();
}
export async function login(page: Page) {
  await page.goto("/");
  await page.getByLabel("E-posta adresi", { exact: true }).fill("e2e-student@example.test");
  await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
}
function row(page: Page, title: string): Locator {
  return page.locator(".sinav-row").filter({ hasText: title });
}
async function enter(page: Page, title: string, minutes: string) {
  const exam = row(page, title);
  await exam.getByRole("button", { name: /^(Sınava gir|Tekrar gir)$/ }).click();
  await exam.getByLabel("Süre (dakika)", { exact: true }).fill(minutes);
  await exam.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(page.getByRole("heading", { name: "Denemen devam ediyor" })).toBeVisible();
}
// The fixture Deneme Sınavı is an armed exam of three questions (in reverse order); the Ders Sınavı holds the same questions in order.
export async function enterDeneme(page: Page, minutes = "5") {
  await page.getByRole("link", { name: "Deneme sınavları", exact: true }).click();
  await enter(page, "1. Deneme Sınavı", minutes);
}
export async function enterDers(page: Page, minutes = "5") {
  await page.getByRole("link", { name: "Ders sınavları", exact: true }).click();
  await enter(page, "1. Ders Sınavı", minutes);
}
export async function answer(page: Page, letter: string) {
  await page.getByRole("radio", { name: new RegExp(`Sentetik ${letter}`) }).check();
  await expect(page.getByText("Cevaplar sunucuda kayıtlı", { exact: true })).toBeVisible();
}
export async function finish(page: Page) {
  await page.getByRole("button", { name: "Denemeyi bitir", exact: true }).click();
  await page.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(page.getByRole("heading", { name: "Deneme sonucun" })).toBeVisible();
}
// Opens a question of a review list (Tekrar) as single-question practice.
export async function openFromReview(page: Page, name = "Sentetik birinci soru", list = "Favorilerim") {
  await page.getByRole("link", { name: "Tekrar", exact: true }).click();
  await page.getByRole("button", { name: list, exact: true }).click();
  await page.locator("article").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Soruyu çöz" }).click();
  await expect(page.getByRole("heading", { name: "Bir soru, bir adım" })).toBeVisible();
}
