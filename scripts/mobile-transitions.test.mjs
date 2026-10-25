// Uses a disposable Expo web export and synthetic HTTP replies; no shared DB or ports.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { chromium, expect } from "@playwright/test";

const root = resolve(process.env.MOBILE_EXPORT_DIR ?? "apps/mobile/dist");
const mime = { ".html": "text/html", ".js": "text/javascript", ".png": "image/png", ".ttf": "font/ttf", ".css": "text/css" };

for (const [width, reducedMotion, colorScheme] of [[390, "no-preference", "light"], [390, "reduce", "light"], [1024, "no-preference", "dark"]]) {
  test(`page transitions: ${width}px, ${reducedMotion}, ${colorScheme}`, async () => {
    await stat(resolve(root, "index.html"));
    const server = createServer(async (req, res) => {
      try {
        let file = resolve(root, `.${new URL(req.url, "http://localhost").pathname}`);
        if (!file.startsWith(`${root}/`)) file = resolve(root, "index.html");
        if (!(await stat(file).catch(() => null))?.isFile()) file = resolve(root, "index.html");
        res.setHeader("Content-Type", mime[extname(file)] ?? "application/octet-stream");
        res.end(await readFile(file));
      } catch { res.writeHead(404); res.end(); }
    });
    await new Promise(r => server.listen(0, "127.0.0.1", r));
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion, colorScheme });
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      const user = { id: "transition-user", name: "Test Öğrenci", email: "transition@example.test", email_verified_at: "2026-01-01T00:00:00Z", platform_role: "student", pending_email: null };
      await page.route("**/api/**", async route => {
        const path = new URL(route.request().url()).pathname;
        let data = { data: [], meta: { current_page: 1, last_page: 1, total: 0 } };
        let status = 200;
        if (path.endsWith("/mobile-tokens")) data = { data: { token: "synthetic-test-token", expires_at: "2099-01-01T00:00:00Z", user } };
        else if (path.endsWith("/contexts")) data = { data: [{ id: "personal", kind: "personal", name: "Kişisel", role: "student" }] };
        else if (path.endsWith("/stats")) { status = 500; data = { message: "Sentetik test hatası" }; }
        await route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*" }, body: JSON.stringify(data) });
      });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.getByLabel("E-posta adresi", { exact: true }).fill(user.email);
      await page.getByLabel("Parola", { exact: true }).fill("Synthetic-Only-42!");
      await page.getByRole("button", { name: "Giriş yap", exact: true }).click();
      await page.getByRole("tab", { name: "Ana sayfa", exact: true }).waitFor();
      const overlay = page.getByTestId("page-transition");
      await expect(overlay).toHaveCount(0);
      await page.clock.install();
      await page.clock.pauseAt(new Date());
      await page.getByRole("tab", { name: "Deneme", exact: true }).click();
      await expect(overlay).toBeVisible();
      await expect(page.getByRole("tab", { name: "Profil", exact: true })).toHaveCount(0);
      const logo = overlay.locator("img");
      const bounds = await logo.boundingBox();
      assert.ok(bounds && Math.abs(bounds.x + bounds.width / 2 - width / 2) < 2, "logo is centered");
      const animatedLogo = overlay.locator(":scope > div").first();
      const before = await animatedLogo.evaluate(el => getComputedStyle(el).transform);
      await page.clock.runFor(210);
      await expect(overlay).toBeVisible();
      const after = await animatedLogo.evaluate(el => getComputedStyle(el).transform);
      if (reducedMotion === "reduce") assert.equal(before, after, "reduced motion stays still");
      else assert.notEqual(before, after, "logo pulses during the transition");
      await page.clock.runFor(210);
      await expect(overlay).toHaveCount(0);
      // Same destination scrolls to the top without replaying the overlay.
      await page.getByRole("tab", { name: "Deneme", exact: true }).click();
      await expect(overlay).toHaveCount(0);
      await page.getByRole("tab", { name: "Profil", exact: true }).click();
      await page.clock.runFor(420);
      await page.getByRole("button", { name: "Hesabım: e-posta, parola, cihazlar, verilerin, hesabı sil", exact: true }).click();
      await expect(overlay).toBeVisible();
      await page.clock.runFor(420);
      await expect(overlay).toHaveCount(0);
      await page.getByRole("button", { name: "Geri dön", exact: true }).click();
      await page.clock.runFor(500);
      await expect(page.getByRole("tab", { name: "Profil", exact: true })).toBeVisible();
      // A failing data request must not trap the user behind the logo.
      await page.getByRole("button", { name: "Menüyü aç", exact: true }).click();
      await page.clock.runFor(500);
      await page.getByRole("button", { name: "Başarı durumum", exact: true }).click();
      await page.clock.runFor(1000);
      await expect(overlay).toHaveCount(0);
      await expect(page.getByRole("alert")).toBeVisible();
      assert.deepEqual(errors, []);
    } finally {
      await browser.close();
      server.closeAllConnections();
      await new Promise(r => server.close(r));
    }
  });
}
