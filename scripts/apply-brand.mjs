// Runtime clients read config/brand.json directly. These static/build-time surfaces are generated from it.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { legalShell } from '../apps/site/shell.mjs';

const html = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const php = (value) => `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;

export function brandFiles(root) {
  const read = (path) => readFileSync(join(root, path), 'utf8');
  const brand = JSON.parse(read('config/brand.json'));
  const url = new URL(brand.websiteUrl);
  if (url.protocol !== 'https:' || url.hostname !== brand.domain || url.pathname !== '/') throw new Error('Marka adresi, alan adıyla eşleşen HTTPS kökü olmalı.');
  for (const key of ['supportEmail', 'mailFromAddress']) if (brand[key] !== '' && !brand[key].endsWith(`@${brand.domain}`)) throw new Error(`${key} marka alan adını kullanmalı.`);
  if (!brand.mailFromAddress) throw new Error('Sistem bildirimi göndereni boş olamaz.');
  const files = new Map();
  const webFontVersion = createHash('sha256').update(readFileSync(join(root, 'config/fonts/LeagueSpartan-Bold.woff2'))).digest('hex').slice(0, 12);
  const fontCss = `/* Generated from config/brand.json and config/fonts; SIL OFL 1.1. */
@font-face { font-family: ${JSON.stringify(brand.wordmarkFontFamily)}; src: url("./LeagueSpartan-Bold.woff2?v=${webFontVersion}") format("woff2"); font-style: normal; font-weight: 700; font-display: swap; }
.brand-wordmark { font-family: ${JSON.stringify(brand.wordmarkFontFamily)}, sans-serif; font-weight: 700; font-style: normal; letter-spacing: .04em; }
`;
  for (const directory of ['apps/mobile/assets/fonts', 'apps/web/public/fonts', 'apps/admin/public/fonts']) {
    files.set(`${directory}/wordmark.css`, fontCss);
    for (const file of ['LeagueSpartan-Bold.woff2', 'OFL.txt']) files.set(`${directory}/${file}`, readFileSync(join(root, 'config/fonts', file)));
  }
  files.set('apps/mobile/assets/fonts/LeagueSpartan-Bold.ttf', readFileSync(join(root, 'config/fonts/LeagueSpartan-Bold.ttf')));
  files.set('apps/mobile/assets/fonts/OFL.json', `${JSON.stringify({ license: read('config/fonts/OFL.txt') }, null, 2)}\n`);
  // A new content URL also refreshes browser/CDN favicon caches after a logo change.
  const faviconHref = `/favicon.png?v=${createHash('sha256').update(readFileSync(join(root, 'apps/mobile/assets/favicon.png'))).digest('hex').slice(0, 12)}`;
  const logoHref = `/brand-logo.png?v=${createHash('sha256').update(readFileSync(join(root, 'apps/mobile/assets/brand-logo.png'))).digest('hex').slice(0, 12)}`;
  for (const app of ['web', 'admin']) {
    const path = `apps/${app}/index.html`;
    const title = app === 'web' ? brand.displayName : `${brand.name} · Yönetim`;
    const description = app === 'web' ? `${brand.displayName}: deneme ve ders sınavları, sonuçlar ve puan hesaplama.` : `${brand.name} merkezi soru bankası yönetim paneli`;
    let source = read(path).replace(/<title>[\s\S]*?<\/title>/, `<title>${html(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/>/, `<meta name="description" content="${html(description)}" />`);
    if (!source.includes('rel="icon"')) source = source.replace('</head>', '<link rel="icon" type="image/png" href="/favicon.png" /></head>');
    source = source.replace(/href="\/favicon\.png(?:\?[^"]*)?"/g, `href="${faviconHref}"`);
    files.set(path, source);
    files.set(`apps/${app}/public/favicon.png`, readFileSync(join(root, 'apps/mobile/assets/favicon.png')));
    files.set(`apps/${app}/public/brand-logo.png`, readFileSync(join(root, 'apps/mobile/assets/brand-logo.png')));
  }
  const fontCssVersion = createHash('sha256').update(fontCss).digest('hex').slice(0, 12);
  const siteCss = read('apps/site/styles.css');
  files.set('apps/web/public/legal/site.css', siteCss);
  const siteCssVersion = createHash('sha256').update(siteCss).digest('hex').slice(0, 12);
  const legalCss = read('apps/web/public/legal/legal.css').replace(/@import url\("\/fonts\/wordmark\.css(?:\?[^"]*)?"\);/, `@import url("/fonts/wordmark.css?v=${fontCssVersion}");`)
    .replace(/@import url\("site\.css(?:\?[^"]*)?"\);/, `@import url("site.css?v=${siteCssVersion}");`);
  files.set('apps/web/public/legal/legal.css', legalCss);
  const legalCssHref = `/legal/legal.css?v=${createHash('sha256').update(legalCss).digest('hex').slice(0, 12)}`;
  const titles = { gizlilik: 'Gizlilik Politikası ve KVKK Aydınlatma Metni', kosullar: 'Kullanım Koşulları', destek: 'Destek', 'hesap-silme': 'Hesap silme' };
  for (const [page, title] of Object.entries(titles)) {
    const shell = legalShell(read('apps/site/index.html'), brand, page);
    const path = `apps/web/public/legal/${page}.html`;
    const deletionSubject = `${brand.name} hesap silme talebi`;
    let source = read(path).replace(/<title>[\s\S]*?<\/title>/, `<title>${title} · ${html(brand.name)}</title>`)
      .replace(/href="\/legal\/legal\.css(?:\?[^"]*)?"/g, `href="${legalCssHref}"`)
      .replace(/<a class="brand" href="\/">[\s\S]*?<\/a>/, `<a class="brand" href="/"><img src="${logoHref}" width="48" height="48" alt=""><span><span class="brand-wordmark">${html(brand.name)}</span><small>${html(brand.subtitle)}</small></span></a>`)
      .replaceAll('OGGAQ — ÖGG Soru Cevap Platformu', html(brand.displayName))
      .replaceAll('ÖGG Soru Cevap Platformu’nu', `${html(brand.displayName)} uygulamasını`)
      .replaceAll('OGGAQ hesap silme talebi', `${html(brand.name)} hesap silme talebi`)
      .replace(/(<span data-brand="displayName">)[\s\S]*?(<\/span>)/g, `$1${html(brand.displayName)}$2`)
      .replace(/(<span data-brand="deletionSubject">)[\s\S]*?(<\/span>)/g, `$1${html(deletionSubject)}$2`)
      .replace(/(data-(?:placeholder|filled)="destek-eposta-baglantisi" href="mailto:[^"?]*\?subject=)[^"]*/g, `$1${encodeURIComponent(deletionSubject)}`);
    if (!source.includes('rel="icon"')) source = source.replace('</head>', '<link rel="icon" type="image/png" href="/favicon.png" /></head>');
    source = source.replace(/href="\/favicon\.png(?:\?[^"]*)?"/g, `href="${faviconHref}"`);
    source = source.replace(/<header\b[\s\S]*?<\/header>(?:\s*<nav class="legal-nav wrap"[\s\S]*?<\/nav>)?/, `${shell.header}\n${shell.navigation}`)
      .replace(/<footer\b[\s\S]*?<\/footer>/, shell.footer);
    files.set(path, source);
  }
  const metadata = JSON.parse(read('docs/store-metadata.tr.json'));
  metadata.productionBaseUrl = brand.websiteUrl;
  metadata.appStore.name = brand.displayName;
  metadata.googlePlay.title = brand.displayName;
  metadata.contact.email = brand.supportEmail;
  metadata.notes = metadata.notes.filter((note) => !note.includes('Mevcut OGGAQ') && !note.includes('Kalıcı üretim adresi') && !note.startsWith('Ürün sahibi marka adını '));
  const note = `Ürün sahibi marka adını ${brand.displayName} ve üretim alan adını ${brand.domain} olarak belirledi. Mağazada adın kullanılabilirliği ve canlı alan adı/e-posta doğrulaması ayrıca kontrol edilir.`;
  if (!metadata.notes.includes(note)) metadata.notes.unshift(note);
  files.set('docs/store-metadata.tr.json', `${JSON.stringify(metadata, null, 2)}\n`);
  const eas = JSON.parse(read('apps/mobile/eas.json'));
  for (const profile of ['development', 'preview', 'production']) {
    if (!eas.build[profile]) continue;
    for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_WEB_URL']) eas.build[profile].env[key] = brand.websiteUrl;
  }
  files.set('apps/mobile/eas.json', `${JSON.stringify(eas, null, 2)}\n`);
  files.set('backend/config/brand.php', `<?php\n\n// Generated by npm run brand:apply from config/brand.json.\nreturn [\n${Object.entries(brand).map(([key, value]) => `    ${php(key)} => ${php(value)},`).join('\n')}\n];\n`);
  for (const path of ['backend/.env.example', 'deploy/server-development/.env.example']) {
    files.set(path, read(path).replace(/^APP_NAME=.*$/m, `APP_NAME="${brand.displayName}"`)
      .replace(/^MAIL_FROM_NAME=.*$/m, `MAIL_FROM_NAME="${brand.displayName}"`)
      .replace(/^MAIL_FROM_ADDRESS=.*$/m, `MAIL_FROM_ADDRESS=${brand.mailFromAddress}`));
  }
  return files;
}

export function run(root, { check = false } = {}) {
  const stale = [];
  for (const [path, content] of brandFiles(root)) {
    let current;
    try { current = readFileSync(join(root, path)); } catch { current = Buffer.alloc(0); }
    const expected = Buffer.from(content);
    if (!current.equals(expected)) {
      stale.push(path);
      if (!check) { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), expected); }
    }
  }
  console.log(stale.length ? `${check ? 'Güncel değil' : 'Güncellendi'}: ${stale.join(', ')}` : 'Marka dosyaları güncel.');
  return check && stale.length ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(run(fileURLToPath(new URL('..', import.meta.url)), { check: process.argv.includes('--check') }));
