// Generates the PLACEHOLDER app icon set from design tokens: a white shield with an open book on the brand navy.
// The brand is not final (docs/STORE_RELEASE.md); replace the files in assets/ when the final logo exists and keep the
// sizes. Deterministic: the same tokens give the same PNGs. Run from the repo root: node apps/mobile/scripts/generate-icons.mjs
// Needs Chromium from the Playwright install the e2e suite already uses; no extra package.
import { mkdirSync, writeFileSync } from 'node:fs';
import { inflateSync, deflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { lightPalette } from '../../../packages/design-tokens/src/index.ts';

const out = fileURLToPath(new URL('../assets/', import.meta.url));
mkdirSync(out, { recursive: true });
const { navy, accent } = lightPalette;

// The mark in a 1024 box: shield (white, gold inner line) and an open book (navy pages, gold spine).
const mark = `
  <path d="M512 150 L840 270 V520 C840 720 700 860 512 930 C324 860 184 720 184 520 V270 Z" fill="#FFFFFF"/>
  <path d="M512 196 L796 300 V520 C796 694 676 818 512 880 C348 818 228 694 228 520 V300 Z" fill="none" stroke="${accent}" stroke-width="14" stroke-linejoin="round"/>
  <path d="M512 432 C440 396 360 392 296 412 V652 C360 632 440 636 512 674 Z" fill="${navy}"/>
  <path d="M512 432 C584 396 664 392 728 412 V652 C664 632 584 636 512 674 Z" fill="${navy}"/>
  <path d="M512 432 V674" stroke="${accent}" stroke-width="16" stroke-linecap="round"/>`;
const svg = (content, background) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${background ? `<rect width="1024" height="1024" fill="${background}"/>` : ''}${content}</svg>`;
// The shield spans y 150-930, so it is lifted by 28 to sit on the vertical centre of the canvas.
const centered = `<g transform="translate(0 -28)">${mark}</g>`;
// Android adaptive icons crop to a circle/squircle of about two thirds of the canvas: scale the mark into that safe zone.
const safe = (scale) => `<g transform="translate(512 512) scale(${scale}) translate(-512 -540)">${mark}</g>`;

const assets = [
  { name: 'icon.png', size: 1024, svg: svg(centered, navy), opaque: true }, // Apple: no alpha channel, no rounded corners
  { name: 'adaptive-icon.png', size: 1024, svg: svg(safe(0.62)), opaque: false }, // foreground only; backgroundColor comes from app.config
  { name: 'splash-icon.png', size: 1024, svg: svg(safe(0.8)), opaque: false },
  { name: 'favicon.png', size: 196, svg: svg(centered, navy), opaque: true },
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
    await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${asset.size}px;height:${asset.size}px}</style>${asset.svg}`);
    const shot = await page.screenshot({ type: 'png', omitBackground: !asset.opaque, clip: { x: 0, y: 0, width: asset.size, height: asset.size } });
    writeFileSync(out + asset.name, asset.opaque ? toRgb(shot) : shot);
    await page.close();
    console.log(`${asset.name} ${asset.size}x${asset.size}${asset.opaque ? ' (alfa yok)' : ' (saydam)'}`);
  }
} finally { await browser.close(); }
