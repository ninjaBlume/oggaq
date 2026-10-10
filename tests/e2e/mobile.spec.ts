import { test, expect, type Page } from "@playwright/test";
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
async function login(page: Page) {
  await page.goto("/");
  await page
    .getByLabel("E-posta adresi", { exact: true })
    .fill("e2e-student@example.test");
  await page
    .getByLabel("Parola", { exact: true })
    .fill("Synthetic-Browser-42!");
  await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
}
async function screenshot(page: Page, name: string) {
  mkdirSync("artifacts/mobile-preview/redesign", { recursive: true });
  const panel = page.getByLabel("Uygulama menüsü", { exact: true });
  if (await panel.isVisible()) {
    await expect.poll(async () => (await panel.boundingBox())?.x).toBe(0);
  }
  await page.screenshot({
    path: `artifacts/mobile-preview/redesign/${name}.png`,
  });
}
test.beforeEach(() => fixture("setup-study"));
test.afterAll(() => fixture("cleanup"));
test("mobil sekmeler gerçek Bearer API ile soru, deneme, geçmiş ve çıkış akışını tamamlar", async ({
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
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
  await screenshot(page, "login");
  await login(page);
  await screenshot(page, "home");
  for (const label of ["Ana sayfa", "Soru çöz", "Deneme", "Geçmiş", "Profil"])
    await expect(
      page.getByRole("tab", { name: label, exact: true }),
    ).toBeVisible();
  await page.getByRole("tab", { name: "Soru çöz", exact: true }).click();
  await expect(page.getByText("Soru bankası", { exact: true })).toBeVisible();
  await screenshot(page, "questions");
  await page
    .getByRole("button", { name: "Soruyu çöz", exact: true })
    .first()
    .click();
  await expect(page.getByRole("tab", { name: "Profil" })).not.toBeVisible();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  await expect(page.getByText("Doğru", { exact: true })).toBeVisible();
  await screenshot(page, "practice-result");
  await page.getByRole("button", { name: "Geri dön" }).click();
  await page
    .getByRole("button", { name: "Soruyu çöz", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("radio", { name: "Sentetik A", exact: true }),
  ).toBeEnabled();
  await page.getByRole("radio", { name: "Sentetik B", exact: true }).click();
  await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  await expect(page.getByText("Yanlış", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await page.getByRole("tab", { name: "Geçmiş", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Sonucu incele" }).first(),
  ).toBeVisible();
  await screenshot(page, "history");
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  await page.getByLabel("Soru sayısı", { exact: true }).fill("3");
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("1");
  await screenshot(page, "exam-setup");
  await page.getByRole("button", { name: "Denemeyi başlat" }).click();
  await expect(
    page.getByText("DENEMEN DEVAM EDİYOR", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await expect(
    page.getByText("Cevaplar sunucuda kayıtlı", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "exam-active");
  await page.getByRole("button", { name: "Soru listesi" }).click();
  await page.getByRole("button", { name: "Soru 2", exact: true }).click();
  await expect(page.getByText("Soru 2 / 3", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Önceki soru", exact: true }).click();
  await expect(page.getByText("Soru 1 / 3", { exact: true })).toBeVisible();
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
  await screenshot(page, "exam-result");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(bearerSeen).toBe(true);
  await page.getByRole("button", { name: "Geri dön" }).click();
  await expect(
    page.getByRole("button", { name: "Denemeyi başlat" }),
  ).toBeEnabled();
  await page.getByRole("tab", { name: "Geçmiş", exact: true }).click();
  await page.getByRole("button", { name: "Deneme geçmişi" }).click();
  await expect(page.getByText("%33.33 doğru", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await screenshot(page, "profile");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("ders ve konu panelleri filtreler; çalışma alanı değişimi kişisel geçmişi ayırır", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Sentetik çalışma dersi dersini aç" })
    .click();
  await expect(page.getByText("Soru bankası", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Konu filtresi" }).click();
  await page
    .getByRole("button", { name: "Sentetik konu", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Konu filtresi" }),
  ).toContainText("Sentetik konu");
  await page
    .getByRole("button", { name: "Soruyu çöz", exact: true })
    .first()
    .click();
  await page.getByRole("radio", { name: "Sentetik B", exact: true }).click();
  await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  await expect(page.getByText("Yanlış", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", { name: "Sentetik eğitim kurumu çalışma alanını seç" })
    .click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Geçmiş", exact: true }).click();
  await expect(
    page.getByText("Yeni bir başlangıç", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sonucu incele" }),
  ).not.toBeVisible();
});
test("mobil gezinme küçük telefon ve tablette içerikten bağımsız görünür kalır", async ({
  page,
}) => {
  await login(page);
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("tab", { name: "Soru çöz", exact: true }).click();
    await page
      .getByRole("button", { name: "Soruyu çöz", exact: true })
      .last()
      .scrollIntoViewIfNeeded();
    for (const label of ["Ana sayfa", "Soru çöz", "Deneme", "Geçmiş", "Profil"])
      await expect(
        page.getByRole("tab", { name: label, exact: true }),
      ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await screenshot(page, `questions-${width}`);
  }
});
test("mobil önizleme yenilenince kalıcı olmayan token yeniden giriş gerektirir", async ({
  page,
}) => {
  await login(page);
  await page.reload();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
});

test("boş içerik gerçek API ile açıklanır ve örnek soru gösterilmez", async ({
  page,
}) => {
  fixture("setup");
  await login(page);
  await expect(
    page.getByText("Dersler hazırlanıyor", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Soru çöz", exact: true }).click();
  await expect(
    page.getByText("Sorular hazırlanıyor", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Soruyu çöz", exact: true }),
  ).not.toBeVisible();
  await screenshot(page, "empty-questions");
});

test("yan menü gerçek ekranlara gider, seçimi gösterir ve odağı içinde tutar", async ({
  page,
}) => {
  await login(page);
  const destinations = [
    { menu: "Soru bankası", title: "Soru bankası", tab: "Soru çöz" },
    { menu: "Deneme sınavı", title: "Deneme sınavı", tab: "Deneme" },
    { menu: "Çalışma geçmişi", title: "Geçmişim", tab: "Geçmiş" },
    { menu: "Profilim", title: "Profilim", tab: "Profil" },
    { menu: "Ana sayfa", title: "Merhaba, E2E.", tab: "Ana sayfa" },
  ];
  for (const target of destinations) {
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    const menu = page.getByRole("dialog");
    await expect(menu).toBeVisible();
    await expect(page.getByRole("tab", { name: "Ana sayfa" })).toHaveCount(0);
    await menu.getByRole("button", { name: target.menu, exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page.getByText(target.title, { exact: true })).toBeVisible();
    await expect(
      page.getByRole("tab", { name: target.tab, exact: true }),
    ).toHaveAttribute("aria-selected", "true");
  }
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const menu = page.getByRole("dialog");
  await expect(
    menu.getByRole("button", { name: "Ana sayfa", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await screenshot(page, "sidebar");
  for (let i = 0; i < 16; i++) {
    await page.keyboard.press("Tab");
    expect(
      await menu.evaluate((element) =>
        element.contains(document.activeElement),
      ),
    ).toBe(true);
  }
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Menüyü aç", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await menu.getByRole("button", { name: "Menüyü kapat", exact: true }).click();
  await expect(menu).not.toBeVisible();
});

test("yan menü çalışma alanını ayırır ve gerçek tokenı iptal ederek çıkış yapar", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("tab", { name: "Soru çöz", exact: true }).click();
  await page
    .getByRole("button", { name: "Soruyu çöz", exact: true })
    .first()
    .click();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await page.getByRole("button", { name: "Cevabımı kontrol et" }).click();
  await expect(page.getByText("Doğru", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const menu = page.getByRole("dialog");
  await menu
    .getByRole("button", { name: "Sentetik eğitim kurumu çalışma alanını seç" })
    .click();
  await expect(menu).not.toBeVisible();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Geçmiş", exact: true }).click();
  await expect(
    page.getByText("Yeni bir başlangıç", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sonucu incele" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await expect(
    menu.getByRole("button", {
      name: "Sentetik eğitim kurumu çalışma alanını seç",
    }),
  ).toHaveAttribute("aria-selected", "true");
  const revoked = page.waitForResponse(
    (r) =>
      r.url().endsWith("/api/v1/auth/logout") &&
      r.request().method() === "POST",
  );
  await menu.getByRole("button", { name: "Çıkış yap", exact: true }).click();
  const response = await revoked;
  expect(response.ok()).toBe(true);
  const authorization = response.request().headers()["authorization"];
  expect(authorization?.startsWith("Bearer ")).toBe(true);
  const me = await page.request.get("http://127.0.0.1:8001/api/v1/me", {
    headers: { Authorization: authorization!, Accept: "application/json" },
  });
  expect(me.status()).toBe(401);
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
});

test("yan menüden çıkış başarısızsa oturum korunur ve tekrar denenebilir", async ({
  page,
}) => {
  await login(page);
  let fail = true;
  await page.route("**/api/v1/auth/logout", async (route) => {
    if (fail) {
      fail = false;
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          detail: "Geçici bağlantı sorunu",
          status: 503,
          code: "service_unavailable",
        }),
      });
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Çıkış yap", exact: true })
    .click();
  await expect(
    page.getByText("Geçici bağlantı sorunu", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await expect(page.getByText("Hoş geldin", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Yeniden dene", exact: true }).click();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
});

test("yan menü küçük telefon, tablet ve yatay ekranda kapanır ve sola sürüklenir", async ({
  page,
}) => {
  await login(page);
  for (const viewport of [
    { width: 320, height: 844 },
    { width: 390, height: 844 },
    { width: 834, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
    const menu = page.getByRole("dialog");
    await expect(
      menu.getByRole("button", { name: "Menüyü kapat", exact: true }),
    ).toBeInViewport();
    await expect(
      menu.getByRole("button", { name: "Çıkış yap", exact: true }),
    ).toBeInViewport();
    await menu
      .getByRole("button", {
        name: "Sentetik eğitim kurumu çalışma alanını seç",
      })
      .scrollIntoViewIfNeeded();
    await expect(menu).toBeVisible();
    await expect(
      menu.getByRole("button", {
        name: "Sentetik eğitim kurumu çalışma alanını seç",
      }),
    ).toBeInViewport();
    await screenshot(page, `sidebar-${viewport.width}x${viewport.height}`);
    await page.mouse.click(viewport.width - 12, viewport.height / 2);
    await expect(menu).not.toBeVisible();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const menu = page.getByRole("dialog");
  await expect(
    menu.getByRole("button", { name: "Ana sayfa", exact: true }),
  ).toBeInViewport();
  await expect
    .poll(
      async () =>
        (
          await page
            .getByLabel("Uygulama menüsü", { exact: true })
            .boundingBox()
        )?.x,
    )
    .toBe(0);
  await page.mouse.move(240, 100);
  await page.mouse.down();
  await page.mouse.move(80, 100, { steps: 12 });
  await page.mouse.up();
  await expect(menu).not.toBeVisible();
});
