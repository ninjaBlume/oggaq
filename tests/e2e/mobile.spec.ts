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
  for (const entry of await page.getByTestId("expressive-entry").all()) {
    await expect
      .poll(() =>
        entry.evaluate((el) => {
          const style = getComputedStyle(el);
          return {
            opacity: Number(style.opacity),
            y:
              style.transform === "none"
                ? 0
                : new DOMMatrix(style.transform).m42,
          };
        }),
      )
      .toEqual({ opacity: 1, y: 0 });
  }
  await page.screenshot({
    path: `artifacts/mobile-preview/redesign/${name}.png`,
  });
}
test.beforeEach(() => {
  fixture("setup-study");
  fixture("official-exam");
  fixture("subject-exam");
});
test.afterAll(() => fixture("cleanup"));
// The student enters an exam from its tab: the fixture Deneme Sınavı (armed, three questions in reverse order) or Ders Sınavı.
async function enter(page: Page, tab: "Deneme" | "Ders", minutes = "5") {
  await page.getByRole("tab", { name: tab, exact: true }).click();
  await page.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await page.getByLabel("Süre (dakika)", { exact: true }).fill(minutes);
  await page.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(
    page.getByText("DENEMEN DEVAM EDİYOR", { exact: true }),
  ).toBeVisible();
}
const tabs = ["Ana sayfa", "Deneme", "Ders", "Sonuçlar", "Profil"];
test("mobil sekmeler gerçek Bearer API ile deneme sınavı, sonuçlar ve çıkış akışını tamamlar", async ({
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
  for (const label of tabs)
    await expect(
      page.getByRole("tab", { name: label, exact: true }),
    ).toBeVisible();
  // There is no question bank to browse any more.
  await expect(page.getByRole("tab", { name: "Soru çöz" })).toHaveCount(0);
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  await expect(
    page.getByText("Deneme sınavları", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("1. Deneme Sınavı", { exact: true })).toBeVisible();
  await expect(page.getByText(/önerilen süre 150 dk/)).toBeVisible();
  await screenshot(page, "deneme");
  await page.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await expect(page.getByLabel("Süre (dakika)", { exact: true })).toHaveValue(
    "150",
  );
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("1");
  await screenshot(page, "exam-setup");
  await page.getByRole("button", { name: "Sınavı başlat" }).click();
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
  await page.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(
    page.getByRole("button", { name: "★ Favorilerde" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(await page.evaluate(() => Object.keys(localStorage))).toEqual([]);
  expect(bearerSeen).toBe(true);
  await page.getByRole("button", { name: "Geri dön" }).click();
  await expect(page.getByText(/1 kez · en iyi %33.33/)).toBeVisible();
  await page.getByRole("tab", { name: "Sonuçlar", exact: true }).click();
  await expect(page.getByText("Sonuçlarım", { exact: true })).toBeVisible();
  await expect(page.getByText("%33,3", { exact: true })).toBeVisible();
  await expect(page.getByText("1 doğru", { exact: true })).toBeVisible();
  await screenshot(page, "results");
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await screenshot(page, "profile");
  await page.getByRole("button", { name: "Çıkış yap" }).click();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("ders sınavı dersine göre bulunur ve çözülür; çalışma alanı değişimi kişisel sonuçları ayırır", async ({
  page,
}) => {
  await login(page);
  await page
    .getByRole("button", { name: "Sentetik çalışma dersi dersini aç" })
    .click();
  await expect(page.getByText("Ders sınavları", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ders seçimi" })).toContainText(
    "Sentetik çalışma dersi",
  );
  await expect(page.getByText("1. Ders Sınavı", { exact: true })).toBeVisible();
  await expect(page.getByText(/3 soru · önerilen süre 5 dk/)).toBeVisible();
  await page.getByRole("button", { name: "Sınava gir", exact: true }).click();
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(
    page.getByText("DENEMEN DEVAM EDİYOR", { exact: true }),
  ).toBeVisible();
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await expect(page.getByText(/Devam eden denemen var/)).toBeVisible();
  await page.getByRole("tab", { name: "Profil", exact: true }).click();
  await page
    .getByRole("button", { name: "Sentetik eğitim kurumu çalışma alanını seç" })
    .click();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Sonuçlar", exact: true }).click();
  await expect(
    page.getByText("Henüz bir sınava girmedin", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sınava dön" }),
  ).not.toBeVisible();
});
test("ders sınavlarında çok sayıda uzun ders adı okunur kalır: ders listeden seçilir", async ({
  page,
}) => {
  fixture("more-subject-exams");
  await login(page);
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 844 });
    await page.getByRole("tab", { name: "Ders", exact: true }).click();
    const picker = page.getByRole("button", { name: "Ders seçimi" });
    await expect(picker).toBeVisible();
    // One tidy row, not eleven names squeezed side by side.
    const box = (await picker.boundingBox())!;
    expect(box.height).toBeLessThan(90);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await picker.click();
    const sheet = page.getByRole("button", {
      name: "Sentetik Yangın güvenliği ve tabii felaketlerde müdahale tarzı",
      exact: true,
    });
    await sheet.scrollIntoViewIfNeeded();
    await expect(sheet).toBeInViewport();
    expect((await sheet.boundingBox())!.width).toBeGreaterThan(width / 2);
    await screenshot(page, `ders-picker-${width}`);
    await sheet.click();
    await expect(picker).toContainText("Sentetik Yangın güvenliği");
    await expect(page.getByText("1. Ders Sınavı", { exact: true })).toBeVisible();
  }
});
test("mobil gezinme küçük telefon ve tablette içerikten bağımsız görünür kalır", async ({
  page,
}) => {
  await login(page);
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 844 });
    for (const tab of ["Deneme", "Ders"]) {
      await page.getByRole("tab", { name: tab, exact: true }).click();
      await page
        .getByRole("button", { name: "Sınava gir", exact: true })
        .last()
        .scrollIntoViewIfNeeded();
      for (const label of tabs)
        await expect(
          page.getByRole("tab", { name: label, exact: true }),
        ).toBeInViewport();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await screenshot(page, `${tab.toLowerCase()}-${width}`);
    }
  }
});
test("mobil önizleme yenilenince kalıcı olmayan token yeniden giriş gerektirir", async ({
  page,
}) => {
  await login(page);
  await page.reload();
  await expect(page.getByText("Hoş geldin", { exact: true })).toBeVisible();
});

test("sınav yokken gerçek API ile boş durum açıklanır ve örnek sınav gösterilmez", async ({
  page,
}) => {
  fixture("setup");
  await login(page);
  await expect(
    page.getByText("Dersler hazırlanıyor", { exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  await expect(
    page.getByText("Henüz deneme sınavı yok", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Sınava gir", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("tab", { name: "Ders", exact: true }).click();
  await expect(
    page.getByText("Henüz ders sınavı yok", { exact: true }),
  ).toBeVisible();
  await screenshot(page, "empty-exams");
});

test("yan menü gerçek ekranlara gider, seçimi gösterir ve odağı içinde tutar", async ({
  page,
}) => {
  await login(page);
  const destinations = [
    { menu: "Deneme sınavları", title: "Deneme sınavları", tab: "Deneme" },
    { menu: "Ders sınavları", title: "Ders sınavları", tab: "Ders" },
    { menu: "Sonuçlarım", title: "Sonuçlarım", tab: "Sonuçlar" },
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
  // The question bank is gone from the menu too.
  await expect(
    menu.getByRole("button", { name: "Soru bankası", exact: true }),
  ).toHaveCount(0);
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
  await enter(page, "Deneme");
  await page.getByRole("radio", { name: "Sentetik A", exact: true }).click();
  await page.getByRole("button", { name: "Geri dön" }).click();
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const menu = page.getByRole("dialog");
  await menu
    .getByRole("button", { name: "Sentetik eğitim kurumu çalışma alanını seç" })
    .click();
  await expect(menu).not.toBeVisible();
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Sonuçlar", exact: true }).click();
  await expect(
    page.getByText("Henüz bir sınava girmedin", { exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Sınava dön" })).toHaveCount(0);
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

test("Expressive düğme ve seçim grupları eylemleri korur ve küçük ekrana sığar", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await login(page);
  for (const width of [320, 390, 834]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(
      page.getByRole("button", { name: "Sınava gir", exact: true }),
    ).toBeInViewport();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await screenshot(page, `expressive-home-${width}`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  const start = page.getByRole("button", { name: "Sınava gir", exact: true });
  const radius = await start.evaluate((el) =>
    parseFloat(getComputedStyle(el).borderRadius),
  );
  await start.hover();
  await page.mouse.down();
  await expect
    .poll(() =>
      start.evaluate((el) => parseFloat(getComputedStyle(el).borderRadius)),
    )
    .toBeLessThan(radius);
  await expect(page.getByText("Merhaba, E2E.", { exact: true })).toBeVisible();
  await page.mouse.up();
  await expect(
    page.getByText("Deneme sınavları", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Silahsız sınavlar", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Silahsız sınavlar", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Silahlı sınavlar", exact: true }),
  ).toHaveAttribute("aria-selected", "false");
  await expect(
    page.getByText("Henüz deneme sınavı yok", { exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 320, height: 844 });
  await expect(
    page.getByRole("button", { name: "Silahsız sınavlar", exact: true }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await screenshot(page, "expressive-exam-320");
});

test("sistem hareket azaltma tercihi canlı değişince Expressive hareket kapanır", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await login(page);
  const start = page.getByRole("button", { name: "Sınava gir", exact: true });
  await start.hover();
  await page.mouse.down();
  const scale = () =>
    start.evaluate(
      (el) => new DOMMatrixReadOnly(getComputedStyle(el).transform).a,
    );
  await expect.poll(scale).toBe(1);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(scale).toBeLessThan(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(scale).toBe(1);
  await page.mouse.up();
  await expect(
    page.getByText("Deneme sınavları", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
  const menu = page.getByLabel("Uygulama menüsü", { exact: true });
  await expect.poll(async () => (await menu.boundingBox())?.x).toBe(0);
  await page.keyboard.press("Escape");
  await expect(menu).not.toBeVisible();
  await expect(
    page.getByRole("tab", { name: "Deneme", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
});
test("mobil deneme ve ders sınavları ayrı listelenir", async ({ page }) => {
  await login(page);
  await page.getByRole("tab", { name: "Deneme", exact: true }).click();
  await expect(page.getByText("1. Deneme Sınavı", { exact: true })).toBeVisible();
  await expect(page.getByText("1. Ders Sınavı", { exact: true })).toHaveCount(0);
  await page.getByRole("tab", { name: "Ders", exact: true }).click();
  await expect(page.getByText("1. Ders Sınavı", { exact: true })).toBeVisible();
  await expect(page.getByText("1. Deneme Sınavı", { exact: true })).toHaveCount(0);
});
test("mobil tekrar sınavı hatalardan kurulur; başarı durumu ve sınavlar gerçek API ile çalışır", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  // Ders Sınavı: first question wrong, the other two left blank.
  await enter(page, "Ders");
  await page.getByRole("radio", { name: "Sentetik B", exact: true }).click();
  await expect(
    page.getByText("Cevaplar sunucuda kayıtlı", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Denemeyi bitir", exact: true })
    .click();
  await page.getByRole("button", { name: "Bitir ve değerlendir" }).click();
  await expect(page.getByText("Deneme sonucun", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "☆ Favoriye ekle" }).click();
  await expect(
    page.getByRole("button", { name: "★ Favorilerde" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();

  await page.getByRole("tab", { name: "Ana sayfa", exact: true }).click();
  await page.getByRole("button", { name: "Tekrar ekranını aç" }).click();
  await expect(page.getByText("Tekrar sınavı", { exact: true })).toBeVisible();
  // Review is an exam: counts per list and an exam to enter, no questions to browse.
  await expect(page.getByText(/^1 soru · Son cevabın yanlış/)).toBeVisible();
  await expect(page.getByText(/^2 soru · Son cevabın boş/)).toBeVisible();
  await expect(page.getByText(/^1 soru · Sınav sonucunda/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Soruyu çöz" })).toHaveCount(0);
  await expect(
    page.getByText("Sentetik birinci soru", { exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Tekrar sınavına gir" })
    .first()
    .click();
  await page.getByLabel("Süre (dakika)", { exact: true }).fill("5");
  await page.getByRole("button", { name: "Sınavı başlat" }).click();
  await expect(
    page.getByText("DENEMEN DEVAM EDİYOR", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Sentetik birinci soru", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Soru 1 / 1", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Geri dön" }).click();

  await page.getByRole("tab", { name: "Ana sayfa", exact: true }).click();
  await expect(page.getByText("Doğruluk %0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Başarım ekranını aç" }).click();
  await expect(
    page.getByText("0 doğru · 1 yanlış · 2 boş", { exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await expect(
    page.getByRole("button", { name: "Tekrar sınavı" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Başarı durumum" }).click();

  await enter(page, "Deneme");
  await expect(
    page.getByText("Sentetik üçüncü soru", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
