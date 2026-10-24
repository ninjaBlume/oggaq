import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { deflateSync } from 'node:zlib';
import { checkRelease } from './check-store-release.mjs';

// A minimal valid PNG header + IDAT is not needed: the check reads only IHDR (width, height, colour type).
function pngHeader(width, height, colorType) {
  const body = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(body, 0);
  body.writeUInt32BE(13, 8); body.write('IHDR', 12, 'ascii');
  body.writeUInt32BE(width, 16); body.writeUInt32BE(height, 20); body[24] = 8; body[25] = colorType;
  return Buffer.concat([body, deflateSync(Buffer.alloc(0))]);
}
function repo(mutate = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'store-check-'));
  for (const dir of ['apps/web/public/legal', 'apps/web/src', 'apps/mobile/assets', 'docs']) mkdirSync(join(root, dir), { recursive: true });
  for (const page of ['gizlilik', 'kosullar', 'destek', 'hesap-silme']) writeFileSync(join(root, 'apps/web/public/legal', `${page}.html`), '<main>Son metin</main>');
  writeFileSync(join(root, 'apps/mobile/assets/icon.png'), pngHeader(1024, 1024, 2));
  writeFileSync(join(root, 'apps/mobile/assets/adaptive-icon.png'), pngHeader(1024, 1024, 6));
  writeFileSync(join(root, 'apps/mobile/assets/splash-icon.png'), pngHeader(1024, 1024, 6));
  writeFileSync(join(root, 'apps/mobile/assets/favicon.png'), pngHeader(196, 196, 2));
  writeFileSync(join(root, 'apps/mobile/brand.json'), JSON.stringify({ supportEmail: 'destek@alan.example.org' }));
  writeFileSync(join(root, 'apps/web/src/config.ts'), "export const brand = { supportEmail: 'destek@alan.example.org' };");
  writeFileSync(join(root, 'apps/mobile/eas.json'), JSON.stringify({ build: { production: { env: { EXPO_PUBLIC_API_URL: 'https://soru.gercek.net', EXPO_PUBLIC_WEB_URL: 'https://soru.gercek.net' } } } }));
  writeFileSync(join(root, 'apps/mobile/app.config.ts'), 'const bundleId = process.env.OGGAQ_BUNDLE_ID ?? "com.sirket.uygulama";\nconst c = { version: "1.0.0" };');
  writeFileSync(join(root, 'apps/mobile/package.json'), '{"dependencies":{"expo-splash-screen":"1.0.0"}}');
  writeFileSync(join(root, 'docs/STORE_RELEASE.md'), '# x\n\n## Elle kontrol\n\n- [x] Yapıldı\n\n## Sonraki\n');
  mutate(root);
  return root;
}
const run = (mutate) => { const root = repo(mutate); try { return checkRelease(root); } finally { rmSync(root, { recursive: true, force: true }); } };

test('a finished repository has no blockers and nothing to warn about', () => {
  const result = run();
  assert.deepEqual(result, { blockers: [], warnings: [], manual: [] });
});
test('draft banner and marked placeholders in a legal page block the release', () => {
  const { blockers } = run((root) => writeFileSync(join(root, 'apps/web/public/legal/gizlilik.html'), '<div id="taslak-bandi"></div><mark data-placeholder="veri-sorumlusu-unvan">[x]</mark><mark data-placeholder="verbis">[y]</mark>'));
  assert.equal(blockers.length, 2);
  assert.match(blockers[0], /gizlilik\.html: doldurulmamış 2 alan.*veri-sorumlusu-unvan, verbis/);
  assert.match(blockers[1], /TASLAK/);
});
test('a missing legal page blocks', () => {
  assert.match(run((root) => rmSync(join(root, 'apps/web/public/legal/destek.html'))).blockers[0], /destek\.html/);
});
test('assets: wrong size, alpha in the store icon and missing files', () => {
  const { blockers } = run((root) => {
    writeFileSync(join(root, 'apps/mobile/assets/icon.png'), pngHeader(1024, 1024, 6));
    writeFileSync(join(root, 'apps/mobile/assets/adaptive-icon.png'), pngHeader(512, 512, 6));
    rmSync(join(root, 'apps/mobile/assets/favicon.png'));
  });
  assert.equal(blockers.length, 3);
  assert.match(blockers.join('\n'), /alfa kanalı/);
  assert.match(blockers.join('\n'), /adaptive-icon\.png 1024x1024/);
  assert.match(blockers.join('\n'), /favicon\.png yok/);
});
test('support e-mail must be configured for mobile and web', () => {
  const { blockers } = run((root) => {
    writeFileSync(join(root, 'apps/mobile/brand.json'), JSON.stringify({ supportEmail: '' }));
    writeFileSync(join(root, 'apps/web/src/config.ts'), "export const brand = { supportEmail: '' };");
  });
  assert.equal(blockers.length, 2);
});
test('the production profile needs real HTTPS addresses', () => {
  const insecure = run((root) => writeFileSync(join(root, 'apps/mobile/eas.json'), JSON.stringify({ build: { production: { env: { EXPO_PUBLIC_API_URL: 'http://soru.gercek.net', EXPO_PUBLIC_WEB_URL: 'https://soru.gercek.net' } } } })));
  assert.match(insecure.blockers[0], /EXPO_PUBLIC_API_URL HTTPS/);
  const placeholder = run((root) => writeFileSync(join(root, 'apps/mobile/eas.json'), JSON.stringify({ build: { production: { env: { EXPO_PUBLIC_API_URL: 'https://alan-adi-belirlenmedi.invalid', EXPO_PUBLIC_WEB_URL: 'https://alan-adi-belirlenmedi.invalid' } } } })));
  assert.equal(placeholder.blockers.length, 2);
  assert.match(placeholder.blockers[0], /yer tutucu/);
  assert.match(run((root) => writeFileSync(join(root, 'apps/mobile/eas.json'), '{}')).blockers[0], /production profili yok/);
});
test('placeholder bundle id and version are warnings, not blockers', () => {
  const result = run((root) => writeFileSync(join(root, 'apps/mobile/app.config.ts'), 'const bundleId = process.env.OGGAQ_BUNDLE_ID ?? "net.harunaltay.oggaq";\nconst c = { version: "0.1.0" };'));
  assert.deepEqual(result.blockers, []);
  assert.equal(result.warnings.length, 2);
});
test('the last section of the document is read to its end', () => {
  const { manual } = run((root) => writeFileSync(join(root, 'docs/STORE_RELEASE.md'), '# x\n\n## Elle kontrol\n\n- [ ] Son madde\n'));
  assert.deepEqual(manual, ['Son madde']);
});
test('unchecked "Elle kontrol" items are listed as reminders', () => {
  const { blockers, manual } = run((root) => writeFileSync(join(root, 'docs/STORE_RELEASE.md'), '## Elle kontrol\n\n- [ ] Soru içeriği hakkı yazılı teyit\n- [x] Demo hesap\n- [ ] Uzman puanlama onayı\n\n## Başka\n- [ ] Bu liste dışı\n'));
  assert.deepEqual(blockers, []);
  assert.deepEqual(manual, ['Soru içeriği hakkı yazılı teyit', 'Uzman puanlama onayı']);
});
