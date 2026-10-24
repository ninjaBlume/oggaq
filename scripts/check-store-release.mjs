// Offline pre-flight for an App Store / Play Store submission. Prints what still blocks a release (exit code 1), what needs
// a decision (warnings) and what only a person can verify (docs/STORE_RELEASE.md "Elle kontrol"). Reads files only.
// Usage: npm run check:store
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const legalFiles = ['gizlilik', 'kosullar', 'destek', 'hesap-silme'];
const placeholderHost = /(^|\.)(invalid|example|test|localhost)$|^(127\.|10\.|192\.168\.)/;

function read(path) { return existsSync(path) ? readFileSync(path, 'utf8') : null; }
function png(path) {
  if (!existsSync(path)) return null;
  const head = readFileSync(path).subarray(0, 33);
  if (head.toString('ascii', 1, 4) !== 'PNG') return { invalid: true };
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20), colorType: head[25] };
}
function hostOf(url) { try { return new URL(url).hostname; } catch { return null; } }

export function checkRelease(root) {
  const blockers = []; const warnings = []; const manual = [];
  const web = join(root, 'apps/web'); const mobile = join(root, 'apps/mobile');

  // 1. Public legal pages must be final: no draft banner, no marked placeholder.
  for (const page of legalFiles) {
    const html = read(join(web, 'public/legal', `${page}.html`));
    if (html === null) { blockers.push(`Yasal sayfa yok: apps/web/public/legal/${page}.html`); continue; }
    const keys = [...html.matchAll(/data-placeholder="([^"]+)"/g)].map((match) => match[1]);
    if (keys.length > 0) blockers.push(`${page}.html: doldurulmamış ${new Set(keys).size} alan var (${[...new Set(keys)].join(', ')}).`);
    if (html.includes('id="taslak-bandi"')) blockers.push(`${page}.html: "TASLAK" bandı duruyor; hukukçu onayından sonra kaldırın.`);
  }

  // 2. Store assets: sizes, and an App Store icon without an alpha channel.
  const assets = join(mobile, 'assets');
  const icon = png(join(assets, 'icon.png'));
  if (!icon) blockers.push('apps/mobile/assets/icon.png yok.');
  else if (icon.invalid || icon.width !== 1024 || icon.height !== 1024) blockers.push('icon.png 1024x1024 PNG olmalı.');
  else if (icon.colorType === 6 || icon.colorType === 4) blockers.push('icon.png alfa kanalı içeriyor; App Store simgesi saydamlık içeremez.');
  const adaptive = png(join(assets, 'adaptive-icon.png'));
  if (!adaptive) blockers.push('apps/mobile/assets/adaptive-icon.png yok.');
  else if (adaptive.invalid || adaptive.width !== 1024 || adaptive.height !== 1024) blockers.push('adaptive-icon.png 1024x1024 PNG olmalı.');
  for (const name of ['splash-icon.png', 'favicon.png']) if (!existsSync(join(assets, name))) blockers.push(`apps/mobile/assets/${name} yok.`);

  // 3. Contact details configured (the legal pages carry the data controller and the privacy text).
  let brand = {};
  try { brand = JSON.parse(read(join(mobile, 'brand.json')) ?? '{}'); } catch { blockers.push('apps/mobile/brand.json okunamadı.'); }
  if (!brand.supportEmail) blockers.push('apps/mobile/brand.json: supportEmail boş (destek e-postası).');
  const webConfig = read(join(web, 'src/config.ts')) ?? '';
  if (!/supportEmail:\s*'[^']+@[^']+'/.test(webConfig)) blockers.push("apps/web/src/config.ts: supportEmail boş (destek e-postası).");

  // 4. Production build profile: HTTPS addresses of the real host (also the base of the privacy-policy URL).
  let eas = {};
  try { eas = JSON.parse(read(join(mobile, 'eas.json')) ?? '{}'); } catch { blockers.push('apps/mobile/eas.json okunamadı.'); }
  if (!eas.build?.production) blockers.push('apps/mobile/eas.json: production profili yok.');
  for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL']) {
    const value = eas.build?.production?.env?.[key];
    const host = value ? hostOf(value) : null;
    if (!value || !value.startsWith('https://') || host === null) blockers.push(`eas.json production: ${key} HTTPS adres olmalı (şu an: ${value ?? 'yok'}).`);
    else if (placeholderHost.test(host)) blockers.push(`eas.json production: ${key} yer tutucu bir adrese bakıyor (${host}); gerçek alan adını yazın.`);
  }

  // 5. Decisions that are not blockers by themselves.
  const appConfig = read(join(mobile, 'app.config.ts')) ?? '';
  const bundle = /OGGAQ_BUNDLE_ID \?\? "([^"]+)"/.exec(appConfig)?.[1];
  if (bundle === 'net.harunaltay.oggaq') warnings.push('Paket kimliği hâlâ geçici (net.harunaltay.oggaq). İlk yüklemeden sonra değiştirilemez; yayıncı kararı gerekir.');
  const version = /\bversion:\s*"([^"]+)"/.exec(appConfig)?.[1];
  if (version === '0.1.0') warnings.push('Sürüm hâlâ 0.1.0.');
  const mobilePackage = read(join(mobile, 'package.json')) ?? '';
  if (!mobilePackage.includes('"expo-splash-screen"')) warnings.push('expo-splash-screen kurulu değil: yerel açılış ekranı markalı değil (paket eklemek onay ister).');

  // 6. Things only a person can verify: unchecked items under "## Elle kontrol" of docs/STORE_RELEASE.md.
  const doc = read(join(root, 'docs/STORE_RELEASE.md'));
  if (doc === null) blockers.push('docs/STORE_RELEASE.md yok.');
  else {
    const section = /^## Elle kontrol\s*$([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(doc)?.[1] ?? '';
    for (const line of section.split('\n')) { const item = /^- \[ \] (.+)$/.exec(line.trim()); if (item) manual.push(item[1]); }
  }
  return { blockers, warnings, manual };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { blockers, warnings, manual } = checkRelease(fileURLToPath(new URL('..', import.meta.url)));
  const list = (title, items, mark) => { if (items.length) { console.log(`\n${title} (${items.length})`); for (const item of items) console.log(`  ${mark} ${item}`); } };
  list('ENGELLER — bunlar çözülmeden mağazaya gönderilmez', blockers, '✗');
  list('KARAR / UYARI', warnings, '!');
  list('ELLE KONTROL — docs/STORE_RELEASE.md', manual, '☐');
  console.log(blockers.length ? `\nSonuç: ${blockers.length} engel var.` : '\nSonuç: otomatik kontrol engeli yok (elle kontrol maddelerini ayrıca tamamlayın).');
  process.exit(blockers.length ? 1 : 0);
}
