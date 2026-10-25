// Derive platform sizes from the approved Ogg Sor logo; never redraw the artwork.
// Run from the repo root: node apps/mobile/scripts/generate-icons.mjs && npm run brand:apply
// Uses the existing Playwright Chromium install; no extra dependency or node_modules copy.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { lightPalette } from '../../../packages/design-tokens/src/index.ts';

const root = new URL('../../../', import.meta.url);
const brand = JSON.parse(readFileSync(new URL('config/brand.json', root), 'utf8'));
const image = `data:image/png;base64,${readFileSync(new URL(brand.logoAsset, root)).toString('base64')}`;
const out = fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(out, { recursive: true });
const assets = [
  { name: 'icon.png', size: 1024, scale: 1, opaque: true }, // Apple: square RGB canvas, no alpha channel.
  { name: 'adaptive-icon.png', size: 1024, scale: 0.62, opaque: false }, // Complete mark inside Android's safe zone.
  { name: 'splash-icon.png', size: 1024, scale: 0.8, opaque: false },
  { name: 'favicon.png', size: 196, scale: 1, opaque: false },
  { name: 'brand-logo.png', size: 256, scale: 1, opaque: false },
];

// Chromium may write RGBA PNGs even for opaque pages. Apple rejects an App Store icon with an alpha channel, so opaque
// icons are re-encoded as RGB (a PNG that is already RGB is kept as is).
function toRgb(png) {
  const signature = png.subarray(0, 8);
  let offset = 8; let width = 0; let height = 0; const data = [];
  while (offset < png.length) {
    const length = png.readUInt32BE(offset); const type = png.toString('ascii', offset + 4, offset + 8);
    const body = png.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); if (body[8] !== 8 || (body[9] !== 6 && body[9] !== 2)) throw new Error('Beklenen biçim 8 bit RGB/RGBA'); if (body[9] === 2) return png; /* already without alpha */ }
    if (type === 'IDAT') data.push(body);
    offset += 12 + length;
  }
  const raw = inflateSync(Buffer.concat(data));
  const stride = width * 4; const pixels = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) { // undo PNG scanline filters
    const filter = raw[y * (stride + 1)]; const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let x = 0; x < stride; x++) {
      const a = x >= 4 ? pixels[y * stride + x - 4] : 0; const b = y > 0 ? pixels[(y - 1) * stride + x] : 0; const c = x >= 4 && y > 0 ? pixels[(y - 1) * stride + x - 4] : 0;
      const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c);
      const predictor = [0, a, b, (a + b) >> 1, pa <= pb && pa <= pc ? a : pb <= pc ? b : c][filter];
      pixels[y * stride + x] = (line[x] + predictor) & 255;
    }
  }
  const rgb = Buffer.alloc(height * (width * 3 + 1));
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[y * stride + x * 4 + 3] !== 255) throw new Error('Opak simge yarı saydam piksel içeriyor');
    pixels.copy(rgb, y * (width * 3 + 1) + 1 + x * 3, y * stride + x * 4, y * stride + x * 4 + 3);
  }
  const chunk = (type, body) => { const head = Buffer.alloc(8); head.writeUInt32BE(body.length, 0); head.write(type, 4, 'ascii'); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])) >>> 0, 0); return Buffer.concat([head, body, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([signature, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(rgb, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}
const table = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
function crc32(buffer) { let c = 0xffffffff; for (const byte of buffer) c = table[(c ^ byte) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

const browser = await chromium.launch();
try {
  for (const asset of assets) {
    const page = await browser.newPage({ viewport: { width: asset.size, height: asset.size }, deviceScaleFactor: 1 });
    const side = asset.size * asset.scale;
    await page.setContent(`<style>html,body{margin:0;width:100%;height:100%;background:${asset.opaque ? lightPalette.navy : 'transparent'}}body{display:grid;place-items:center}img{display:block;width:${side}px;height:${side}px;object-fit:contain;clip-path:inset(2.6% round 21%)}</style><img src="${image}" alt="">`);
    await page.locator('img').evaluate(async (img) => { await img.decode(); });
    const shot = await page.screenshot({ type: 'png', omitBackground: !asset.opaque, clip: { x: 0, y: 0, width: asset.size, height: asset.size } });
    writeFileSync(out + asset.name, asset.opaque ? toRgb(shot) : shot);
    await page.close();
    console.log(`${asset.name} ${asset.size}x${asset.size}${asset.opaque ? ' (alfa yok)' : ' (saydam)'}`);
  }
} finally { await browser.close(); }
