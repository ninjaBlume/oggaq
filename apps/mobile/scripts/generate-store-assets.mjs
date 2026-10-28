// Render store artwork from the approved brand and copy actual device captures unchanged.
// Usage: node apps/mobile/scripts/generate-store-assets.mjs <capture-directory> <output-directory>
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { lightPalette } from '../../../packages/design-tokens/src/index.ts';

const root = fileURLToPath(new URL('../../../', import.meta.url));
if (!process.argv[2] || !process.argv[3]) throw new Error('Gerçek cihaz ekran klasörü ve çıktı klasörü gerekli.');
const captures = path.resolve(process.argv[2]);
const output = path.resolve(process.argv[3]);
if (captures === output) throw new Error('Kaynak ekranların üzerine yazılmaz.');
const brand = JSON.parse(await readFile(path.join(root, 'config/brand.json'), 'utf8'));
const pngInfo = bytes => {
  if (bytes.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('PNG dosyası gerekli.');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
};
const screenshots = ['01-home.png', '02-exams.png', '03-question.png', '04-score.png'];
const source = new Map();
for (const name of screenshots) {
  const bytes = await readFile(path.join(captures, name));
  const { width, height } = pngInfo(bytes);
  if (width !== 1080 || height !== 1920) throw new Error(`${name}: 1080×1920 gerçek cihaz görüntüsü gerekli.`);
  source.set(name, bytes);
}
const dataUrl = (bytes, type) => `data:${type};base64,${bytes.toString('base64')}`;
const logo = dataUrl(await readFile(path.join(root, 'apps/mobile/assets/icon.png')), 'image/png');
const font = dataUrl(await readFile(path.join(root, 'config/fonts/LeagueSpartan-Bold.woff2')), 'font/woff2');
const home = dataUrl(source.get('01-home.png'), 'image/png');
const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;width:512px;height:512px;background:${lightPalette.navy}}img{width:512px;height:512px;display:block}</style><img src="${logo}" alt="">`);
  await page.locator('img').evaluate(img => img.decode());
  await page.screenshot({ path: path.join(output, 'play-icon-512.png') });
  await page.setViewportSize({ width: 1024, height: 500 });
  await page.setContent(`<!doctype html><html lang="tr"><meta charset="utf-8"><style>
@font-face{font-family:Spartan;src:url('${font}');font-weight:700}*{box-sizing:border-box}html,body{margin:0;width:1024px;height:500px;overflow:hidden}body{background:${lightPalette.navy};color:white;font-family:Arial,sans-serif}.copy{position:absolute;inset:46px auto 42px 54px;width:614px}.brand{display:flex;align-items:center;gap:14px}.mark{width:52px;height:52px;border-radius:12px}.name{font:700 38px/.95 Spartan,Arial,sans-serif;margin:0}.subtitle{margin:6px 0 0;color:${lightPalette.onNavyMuted};font-size:16px}h1{font-size:46px;line-height:1.12;letter-spacing:-1.2px;margin:54px 0 22px;font-weight:700}.education{font-size:21px;line-height:1.4;color:${lightPalette.onNavyMuted};margin:0}.features{position:absolute;bottom:0;margin:0;font-size:17px;color:${lightPalette.onNavyMuted}}.phone{position:absolute;top:18px;right:58px;width:266px;height:464px;border:6px solid #ECF2FC;border-radius:30px;background:${lightPalette.paper};overflow:hidden;box-shadow:0 12px 28px #071A2C80}.screen{display:block;width:100%;height:100%;object-fit:cover}</style><div class="copy"><div class="brand"><img class="mark" src="${logo}" alt=""><div><p class="name">${escape(brand.name)}</p><p class="subtitle">${escape(brand.subtitle)}</p></div></div><h1>Çıkmış sorularla<br>sınavına hazırlan.</h1><p class="education">Temel ve yenileme eğitimi</p><p class="features">Deneme · Ders · Tekrar · Puan hesaplama</p></div><div class="phone"><img class="screen" src="${home}" alt="Gerçek Android uygulama ekranı"></div></html>`);
  await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
  await page.screenshot({ path: path.join(output, 'play-feature-1024x500.png') });
} finally { await browser.close(); }
for (const name of screenshots) await copyFile(path.join(captures, name), path.join(output, name));
const files = [];
for (const name of ['play-icon-512.png', 'play-feature-1024x500.png', ...screenshots]) {
  const bytes = await readFile(path.join(output, name));
  files.push({ name, ...pngInfo(bytes), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') });
}
await writeFile(path.join(output, 'manifest.json'), JSON.stringify({ brand: brand.displayName, screenshotsUnmodified: true, files }, null, 2) + '\n');
console.log(JSON.stringify({ output, files }, null, 2));
