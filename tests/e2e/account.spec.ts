import { test, expect } from "@playwright/test";
import type { Browser, Locator, Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { browserTestEnv, phpBinary } from "../../playwright.config";

// Account lifecycle on the real stack: sessions, password and e-mail change, export, and deletion of throw-away accounts.
function fixture(operation: string, email?: string) {
  return execFileSync(phpBinary, ["scripts/e2e-fixtures.php", operation, ...(email ? [email] : [])], { env: browserTestEnv, encoding: "utf8", stdio: "pipe" }).trim();
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));

const web = "http://127.0.0.1:5183";
const mobile = "http://127.0.0.1:5185";
const password = "Synthetic-Browser-42!";
const newPassword = "Another-Browser-77!";

async function webLogin(page: Page, email: string, secret = password) {
  await page.goto(`${web}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
}
async function signedIn(browser: Browser, email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await webLogin(page, email);
  await expect(page.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
  return { context, page };
}
async function openAccount(page: Page) {
  await page.getByRole("link", { name: "Hesabım", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Hesabım", exact: true })).toBeVisible();
}
function section(page: Page, title: string): Locator {
  return page.locator("section.account-section").filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

test("web: parola değişince diğer oturum kapanır, eski parola geçersiz olur", async ({ browser }) => {
  const email = "e2e-password@example.test";
  fixture("disposable-user", email);
  const first = await signedIn(browser, email);
  const second = await signedIn(browser, email);
  await openAccount(first.page);
  const devices = first.page.getByRole("list", { name: "Açık oturumlar" }).getByRole("listitem");
  await expect(devices).toHaveCount(2);
  await expect(first.page.getByText("Bu cihaz", { exact: true })).toHaveCount(1);
  const form = section(first.page, "Parolayı değiştir");
  await form.getByLabel("Mevcut parola", { exact: true }).fill(password);
  await form.getByLabel("Yeni parola", { exact: true }).fill(newPassword);
  await form.getByLabel("Yeni parola tekrar", { exact: true }).fill(newPassword);
  await form.getByRole("button", { name: "Parolayı değiştir", exact: true }).click();
  await expect(form.getByRole("status")).toContainText("Parolan değiştirildi");
  // The other browser is signed out; this one stays signed in.
  await second.page.reload();
  await expect(second.page.getByRole("button", { name: "Giriş yap", exact: true })).toBeVisible();
  await first.page.reload();
  await expect(first.page.getByRole("heading", { name: "Hesabım", exact: true })).toBeVisible();
  // Old password no longer works, the new one does.
  const third = await browser.newContext();
  const fresh = await third.newPage();
  await webLogin(fresh, email, password);
  await expect(fresh.getByRole("alert")).toBeVisible();
  await webLogin(fresh, email, newPassword);
  await expect(fresh.getByRole("heading", { name: "Deneme sınavları" })).toBeVisible();
  for (const context of [first.context, second.context, third]) await context.close();
});

test("web: başka cihazın oturumu tek tek kapatılır", async ({ browser }) => {
  const email = "e2e-devices@example.test";
  fixture("disposable-user", email);
  const first = await signedIn(browser, email);
  const second = await signedIn(browser, email);
  await openAccount(first.page);
  const devices = first.page.getByRole("list", { name: "Açık oturumlar" }).getByRole("listitem");
  await expect(devices).toHaveCount(2);
  await first.page.getByRole("button", { name: /oturumunu kapat$/ }).click();
  await expect(devices).toHaveCount(1);
  await second.page.reload();
  await expect(second.page.getByRole("button", { name: "Giriş yap", exact: true })).toBeVisible();
  await first.context.close();
  await second.context.close();
});

test("web: veriler yalnızca kullanıcının kendi verisiyle JSON olarak iner", async ({ browser }) => {
  const email = "e2e-export@example.test";
  fixture("disposable-user", email);
  const { context, page } = await signedIn(browser, email);
  await openAccount(page);
  const form = section(page, "Verilerimi indir");
  await form.getByLabel("Mevcut parola", { exact: true }).fill("wrong-Password-1!");
  await form.getByRole("button", { name: "Verilerimi indir", exact: true }).click();
  await expect(form.getByText("Mevcut parola hatalı.")).toBeVisible();
  await form.getByLabel("Mevcut parola", { exact: true }).fill(password);
  const [download] = await Promise.all([page.waitForEvent("download"), form.getByRole("button", { name: "Verilerimi indir", exact: true }).click()]);
  expect(download.suggestedFilename()).toMatch(/^oggaq-verilerim-\d{4}-\d{2}-\d{2}\.json$/);
  const text = readFileSync((await download.path())!, "utf8");
  const data = JSON.parse(text);
  expect(data.profile.email).toBe(email);
  expect(data.exam_attempts).toHaveLength(1);
  expect(data.exam_attempts[0].answers).toHaveLength(3);
  expect(text).toContain("Sentetik");
  expect(text).not.toContain("e2e-student@example.test");
  expect(text).not.toContain("e2e-admin@example.test");
  await context.close();
});

test("web: e-posta değişikliği imzalı bağlantıyla yeni adrese taşınır", async ({ browser }) => {
  const email = "e2e-old-address@example.test";
  const next = "e2e-new-address@example.test";
  fixture("disposable-user", email);
  const { context, page } = await signedIn(browser, email);
  await openAccount(page);
  const form = section(page, "E-posta adresini değiştir");
  await form.getByLabel("Yeni e-posta adresi", { exact: true }).fill(next);
  await form.getByLabel("Mevcut parola", { exact: true }).fill(password);
  await form.getByRole("button", { name: "Doğrulama bağlantısı gönder", exact: true }).click();
  await expect(form.getByRole("status").filter({ hasText: "gönderildi" })).toBeVisible();
  await expect(page.getByText(next, { exact: true })).toBeVisible();
  expect(fixture("user-exists", next)).toBe("0");
  await page.goto(fixture("email-change-link", email));
  await expect(page.getByRole("heading", { name: "Yeni e-posta adresini onayla" })).toBeVisible();
  await page.getByRole("button", { name: "Yeni adresi onayla", exact: true }).click();
  await expect(page.getByRole("heading", { name: "E-posta adresin güncellendi" })).toBeVisible();
  expect(fixture("user-exists", next)).toBe("1");
  expect(fixture("user-exists", email)).toBe("0");
  await context.close();
});

test("web: hesap silinir; çalışma geçmişi gider, başka hesap kalır, giriş artık olmaz", async ({ browser }) => {
  const email = "e2e-delete@example.test";
  fixture("disposable-user", email);
  const { context, page } = await signedIn(browser, email);
  await openAccount(page);
  const form = section(page, "Hesabı sil");
  const button = form.getByRole("button", { name: "Hesabımı kalıcı olarak sil", exact: true });
  await form.getByLabel("Mevcut parola", { exact: true }).fill(password);
  await expect(button).toBeDisabled();
  await form.getByLabel(/Onay için/).fill("HESABIMI SİL");
  await expect(button).toBeEnabled();
  await button.click();
  await expect(page.getByRole("heading", { name: "Hesabın silindi" })).toBeVisible();
  expect(fixture("user-exists", email)).toBe("0");
  expect(fixture("user-exists", "e2e-student@example.test")).toBe("1");
  await webLogin(page, email);
  await expect(page.getByRole("alert")).toBeVisible();
  await context.close();
});

test("mobil: Hesabım'da cihazlar görünür ve hesap uygulama içinden silinir", async ({ browser }) => {
  const email = "e2e-mobile-delete@example.test";
  fixture("disposable-user", email);
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${mobile}/`);
  await page.getByLabel("E-posta adresi", { exact: true }).fill(email);
  await page.getByLabel("Parola", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page.getByRole("button", { name: /^Hesabım:/ }).click();
  // The stack header and the screen title are both headings.
  await expect(page.getByRole("heading", { name: "Hesabım", exact: true }).last()).toBeVisible();
  await expect(page.getByText("Bu cihaz", { exact: true })).toBeVisible();
  await expect(page.getByText("Web önizleme", { exact: true })).toBeVisible();
  await page.getByLabel("Mevcut parola", { exact: true }).last().fill(password);
  const remove = page.getByRole("button", { name: "Hesabımı kalıcı olarak sil", exact: true });
  await expect(remove).toBeDisabled();
  await page.getByLabel(/Onay için/).fill("HESABIMI SİL");
  await expect(remove).toBeEnabled();
  await remove.click();
  await expect(page.getByRole("heading", { name: "Hesabın silindi" })).toBeVisible();
  expect(fixture("user-exists", email)).toBe("0");
  await page.getByRole("button", { name: "Girişe dön", exact: true }).click();
  await expect(page.getByRole("button", { name: "Giriş yap", exact: true })).toBeVisible();
  await context.close();
});
