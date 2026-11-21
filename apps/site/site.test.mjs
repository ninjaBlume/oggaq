import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildSite, storeLinks } from './site.mjs';
const bundle = 'net.codentum.oggsor';
test('unpublished stores are explicitly unavailable instead of fabricated links', () => {
  assert.deepEqual(storeLinks({ appStoreUrl: null, googlePlayUrl: null }, bundle), { appStore: null, googlePlay: null });
});
test('only HTTPS app pages on the official hosts and the right Android package are accepted', () => {
  assert.equal(storeLinks({ appStoreUrl: 'https://apps.apple.com/tr/app/example/id123456789', googlePlayUrl: `https://play.google.com/store/apps/details?id=${bundle}` }, bundle).googlePlay, `https://play.google.com/store/apps/details?id=${bundle}`);
  for (const url of ['http://apps.apple.com/app/id123', 'javascript:alert(1)', 'https://apps.apple.com.evil.test/app/id123', 'https://user:password@apps.apple.com/app/id123', 'https://apps.apple.com/']) {
    assert.throws(() => storeLinks({ appStoreUrl: url, googlePlayUrl: null }, bundle));
  }
  assert.throws(() => storeLinks({ appStoreUrl: null, googlePlayUrl: 'https://play.google.com/store/apps/details?id=another.app' }, bundle));
});
test('the site renders without scripts, session requests or study forms and preserves legal resources', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'oggsor-site-'));
  try {
    await buildSite({ output: temp, links: { appStoreUrl: null, googlePlayUrl: null } });
    const html = await readFile(path.join(temp, 'index.html'), 'utf8');
    assert.match(html, /<html lang="tr">/);assert.match(html, /ÖGGSor/);assert.match(html, /App Store: yakında/);assert.match(html, /Google Play: yakında/);
    assert.doesNotMatch(html, /<script\b|<form\b|\/api\/|href="#"|\{\{/i);
    assert.match(html, /href="\/legal\/hesap-silme.html"/);
    assert.match(html, /class="app-screen" src="\/screens\/mobile-home.jpg\?v=[a-f0-9]{12}"/);
    assert.ok((await readFile(path.join(temp, 'screens/mobile-home.jpg'))).length > 0);
    assert.ok((await readFile(path.join(temp, 'screens/mobile-exams.png'))).length > 0);
    assert.ok((await readFile(path.join(temp, 'screens/mobile-result.jpg'))).length > 0);
    assert.match(await readFile(path.join(temp, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/oggsor\.com\/sitemap\.xml/);
    const sitemap = await readFile(path.join(temp, 'sitemap.xml'), 'utf8');
    assert.match(sitemap, /<loc>https:\/\/oggsor\.com\/<\/loc>/);
    assert.doesNotMatch(sitemap, /account|yonetim|api\//);
    assert.match(html, /Örnek veriler/);
    assert.ok((await readFile(path.join(temp, 'fonts/LeagueSpartan-Bold.woff2'))).length > 0);
    assert.match(await readFile(path.join(temp, 'legal/gizlilik.html'), 'utf8'), /Gizlilik/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
test('configured store pages become working external links while unavailable stores remain pending', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'oggsor-site-links-'));
  try {
    const apple = 'https://apps.apple.com/tr/app/example/id123456789';
    const google = `https://play.google.com/store/apps/details?id=${bundle}`;
    await buildSite({ output: temp, links: { appStoreUrl: apple, googlePlayUrl: google } });
    const html = await readFile(path.join(temp, 'index.html'), 'utf8');
    assert.ok(html.includes(`href="${apple}"`));assert.ok(html.includes(`href="${google}"`));
    assert.equal((html.match(/rel="noopener noreferrer"/g) ?? []).length, 4);
    assert.doesNotMatch(html, /class="store-card pending"|class="store-notice"/i);
    await buildSite({ output: temp, links: { appStoreUrl: apple, googlePlayUrl: null } });
    assert.match(await readFile(path.join(temp, 'index.html'), 'utf8'), /Google Play: yakında/);
    await buildSite({ output: temp, links: { appStoreUrl: null, googlePlayUrl: google } });
    const androidOnly = await readFile(path.join(temp, 'index.html'), 'utf8');
    assert.match(androidOnly, /App Store: yakında/);
    assert.ok(androidOnly.includes(`href="${google}"`));
    assert.doesNotMatch(androidOnly, /Google Play: yakında|class="store-notice"/);
  } finally { await rm(temp, { recursive: true, force: true }); }
});
