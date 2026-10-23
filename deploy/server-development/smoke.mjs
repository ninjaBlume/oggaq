// Sunucunun loopback portunu SSH ile yönlendirdikten sonra çalıştırılır. Hesap/veri oluşturmaz.
// OGGAQ_ORIGIN=http://127.0.0.1:18080 node deploy/server-development/smoke.mjs
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { isIP } from 'node:net';
import { chromium } from '@playwright/test';

const publicUrl = new URL('https://oggsorubankasi.codentum.net');
const origin = process.env.OGGAQ_ORIGIN ?? 'http://127.0.0.1:18080';
// Yeni DNS kaydı sistemin negatif önbelleğindeyse, yayımlanmış Cloudflare IP'si test için verilebilir.
// Bu seçenek TLS doğrulamasını kapatmaz; sertifika gerçek public hostname için doğrulanır.
const resolveIp = process.env.OGGAQ_RESOLVE_IP;
if (resolveIp && !isIP(resolveIp)) throw new Error('OGGAQ_RESOLVE_IP geçerli bir IP adresi olmalı.');
const browser = await chromium.launch({ headless: true, args: resolveIp ? [`--host-resolver-rules=MAP ${publicUrl.hostname} ${resolveIp}`] : [] });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } });
  // DNS kaydı oluşturulmadan gerçek HTTPS origin davranışını, yerel SSH yönlendirmesi üzerinden doğrular.
  if (process.env.OGGAQ_DIRECT !== '1') await context.route(`${publicUrl.origin}/**`, async route => {
    const url = new URL(route.request().url());
    const response = await route.fetch({
      url: `${origin}${url.pathname}${url.search}`,
      headers: { ...route.request().headers(), host: publicUrl.hostname },
      maxRedirects: 0,
    });
    await route.fulfill({ response });
  });
  await context.addInitScript(() => localStorage.setItem('oggaq-theme', 'dark'));
  const page = await context.newPage();
  const errors = [];
  const sessionReferrers = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/api/v1/me') sessionReferrers.push(request.headers().referer);
  });
  // Sanctum needs Origin or Referer for cookie authentication on same-origin GETs.
  // The query probe must never be included in Referer (reset/verification URLs can contain secrets).
  await page.goto(`${publicUrl.origin}/?referrer_probe=smoke`);
  await page.getByRole('heading', { name: 'Hoş geldin', exact: true }).waitFor();
  assert.equal(sessionReferrers.length, 1);
  assert.equal(sessionReferrers[0], `${publicUrl.origin}/`, 'Same-origin session GET must carry only the origin as Referer.');
  // schedule:work ilk kalp atışını bir sonraki dakika başında yazar.
  let health;
  for (let attempt = 0; attempt < 16; attempt++) {
    health = await page.evaluate(async () => {
      const response = await fetch('/api/v1/health/ready');
      return { status: response.status, body: await response.json() };
    });
    if (health.body.data.status === 'ok') break;
    await setTimeout(5000);
  }
  assert.equal(health.status, 200);
  assert.equal(health.body.data.status, 'ok');

  await page.goto(`${publicUrl.origin}/yonetim/catalogs`);
  await page.getByRole('heading', { name: 'Tekrar hoş geldiniz' }).waitFor();
  assert.equal(sessionReferrers.at(-1), `${publicUrl.origin}/`, 'Admin session GET must carry only the origin as Referer.');
  assert.equal(new URL(page.url()).pathname, '/yonetim/catalogs');
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  assert(await page.locator('script[src="/yonetim/theme-init.js"]').count());
  assert(await page.locator('link[rel="stylesheet"][href^="/yonetim/assets/"]').count());
  await page.getByLabel('E-posta adresi', { exact: true }).fill('unregistered-smoke@example.test');
  await page.getByLabel('Parola', { exact: true }).fill('Not-An-Account-42!');
  const login = page.waitForResponse(response => response.url().endsWith('/api/v1/auth/login'));
  await page.getByRole('button', { name: 'Giriş yap', exact: true }).click();
  assert.equal((await login).status(), 401);
  await page.getByRole('alert').waitFor();
  const csrf = (await context.cookies(publicUrl.origin)).find(cookie => cookie.name === 'XSRF-TOKEN');
  assert(csrf?.secure);
  assert.equal(csrf.domain, publicUrl.hostname);
  assert.equal(await page.evaluate(async () => (await fetch('/api/v1/admin/questions', { headers: { Accept: 'application/json' } })).status), 401);
  for (const path of ['/.env', '/.git/config', '/index.php']) {
    assert.equal(await page.evaluate(async path => (await fetch(path)).status, path), 404);
  }
  assert.deepEqual(errors, []);
  await mkdir('artifacts/server-development', { recursive: true });
  await page.screenshot({ path: 'artifacts/server-development/admin.png', fullPage: true });
  console.log('PASS: web, yönetim alt yolu/yenileme, tema/CSS, hazırlık, origin ile oturum tanıma, CSRF, host-only secure çerez, başarısız giriş, API yetkisi ve gizli dosya koruması.');
} finally {
  await browser.close();
}
