import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { browserTestEnv, phpBinary } from "../../playwright.config";
test.use({ baseURL: "http://127.0.0.1:5183" });
function fixture(op: string) {
  return execFileSync(phpBinary, ["scripts/e2e-fixtures.php", op], {
    env: browserTestEnv,
    encoding: "utf8",
    stdio: "pipe",
  }).trim();
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));
async function login(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("E-posta adresi", { exact: true })
    .fill("e2e-student@example.test");
  await page
    .getByLabel("Parola", { exact: true })
    .fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Bugün ne çalışalım?" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Deneme", exact: true }).click();
}
async function start(page: Page) {
  await page.getByLabel("Soru sayısı", { exact: true }).fill("3");
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Denemeyi başlat" }).click();
  await expect(
    page.getByRole("heading", { name: "Denemen devam ediyor" }),
  ).toBeVisible();
}
async function answer(page: Page, letter: string) {
  await page
    .getByRole("radio", { name: new RegExp(`Sentetik ${letter}`) })
    .check();
  await expect(
    page.getByText("Cevaplar sunucuda kayıtlı", { exact: true }),
  ).toBeVisible();
}
async function finish(page: Page) {
  await page
    .getByRole("button", { name: "Denemeyi bitir", exact: true })
    .click();
  await page.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(
    page.getByRole("heading", { name: "Deneme sonucun" }),
  ).toBeVisible();
}
test("deneme cevapları saklanır; bitişte doğru yanlış boş ve kaynak açıklaması gösterilir", async ({
  page,
}) => {
  await login(page);
  await start(page);
  await expect(
    page.getByText("Sentetik açıklama", { exact: false }),
  ).toHaveCount(0);
  await answer(page, "A");
  await page.getByRole("button", { name: "Sonraki soru" }).click();
  await answer(page, "B");
  const url = page.url();
  await page.reload();
  await expect(page.getByRole("radio", { name: /Sentetik A/ })).toBeChecked();
  await finish(page);
  await expect(
    page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" }),
  ).toContainText("1 doğru · 1 yanlış · 1 boş");
  await expect(
    page.getByText("Sentetik açıklama — gerçek sınav içeriği değildir.", {
      exact: true,
    }),
  ).toBeVisible();
  mkdirSync("artifacts/web-preview", { recursive: true });
  await page.screenshot({
    path: "artifacts/web-preview/exam-result.png",
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Denemelerime dön", exact: false })
    .click();
  await page
    .getByRole("region", { name: "Deneme geçmişi" })
    .getByRole("link")
    .click();
  await expect(page).toHaveURL(url);
  await expect(
    page.getByRole("heading", { name: "Deneme sonucun" }),
  ).toBeVisible();
});
test("süre sunucuda dolar ve tarayıcı otomatik sonucu getirir", async ({
  page,
}) => {
  await login(page);
  await page.goto(fixture("near-deadline"));
  await expect(
    page.getByRole("heading", { name: "Deneme sonucun" }),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByText("Süre dolduğunda tamamlandı.", { exact: false }),
  ).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" }),
  ).toContainText("3 boş");
});
test("kaybolan cevap yanıtı aynı işlemle tekrar edilir ve tek cevap kalır", async ({
  page,
}) => {
  await login(page);
  await start(page);
  let lost = false;
  await page.route("**/exam-attempts/*/answers/*", async (route) => {
    if (!lost) {
      lost = true;
      await route.fetch();
      await route.abort("internetdisconnected");
    } else await route.continue();
  });
  await page.getByRole("radio", { name: /Sentetik A/ }).check();
  await expect(page.getByRole("alert")).toContainText("Sunucuya ulaşılamıyor");
  await expect(page.getByRole("radio", { name: /Sentetik B/ })).toBeDisabled();
  await page.getByRole("button", { name: "Yeniden dene" }).click();
  await expect(
    page.getByText("Cevaplar sunucuda kayıtlı", { exact: true }),
  ).toBeVisible();
  await finish(page);
  await expect(
    page.getByRole("status").filter({ hasText: "DOĞRU YÜZDESİ" }),
  ).toContainText("1 doğru · 0 yanlış · 2 boş");
});
test("eski sekme diğer cevabı ezemez; güncel kayıtla devam eder", async ({
  page,
}) => {
  await login(page);
  await start(page);
  const other = await page.context().newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole("heading", { name: "Denemen devam ediyor" }),
  ).toBeVisible();
  await answer(page, "A");
  await other.getByRole("radio", { name: /Sentetik B/ }).check();
  await expect(other.getByRole("alert")).toContainText(
    "Deneme başka bir işlemde güncellendi.",
  );
  await other.getByRole("button", { name: "Güncel kaydı yükle" }).click();
  await expect(other.getByRole("radio", { name: /Sentetik A/ })).toBeChecked();
  await other.close();
});
test("yetersiz havuz hatası düzeltilebilir; telefon ve tablet denemesi taşmaz", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("button", { name: "Denemeyi başlat" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByLabel("Soru sayısı", { exact: true }).fill("3");
  await start(page);
  for (const width of [834, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(page.getByRole("radio", { name: /Sentetik A/ })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: "artifacts/web-preview/mobile-exam.png",
    fullPage: true,
  });
});
