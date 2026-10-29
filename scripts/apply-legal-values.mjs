// Fills the marked placeholders of the public legal pages (apps/web/public/legal/*.html) and the support e-mail of the
// apps from ONE file, docs/legal-values.json, so nobody edits HTML by hand. Idempotent: running it again with changed
// values updates the pages; an empty value restores the marked placeholder (so `npm run check:store` keeps blocking).
// Usage: npm run legal:apply            apply the values
//        npm run legal:apply -- --check list the values that are still empty (exit 1) without writing anything
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run as applyBrand } from './apply-brand.mjs';

export const pages = ['gizlilik', 'kosullar', 'destek', 'hesap-silme'];
export const labels = {
  'yururluk-tarihi': '[YÜRÜRLÜK TARİHİ]', 'yayinci-adi': '[MAĞAZADAKİ YAYINCI ADI]', 'destek-eposta': '[DESTEK E-POSTA ADRESİ]',
  'yanit-suresi': '[YANIT SÜRESİ]', 'yedek-suresi': '[YEDEK SAKLAMA SÜRESİ]', 'basvuru-sureci': '[BAŞVURU SÜRECİNİN İŞLEYİŞİ — ürün sahibi ve hukukçu teyit etmeli]',
  'yurt-disi-aktarim': '[YURT DIŞI AKTARIM KARARI]', 'veri-sorumlusu-unvan': '[VERİ SORUMLUSU UNVANI]', 'veri-sorumlusu-adres': '[VERİ SORUMLUSU ADRESİ]',
  verbis: '[VERBİS KAYIT DURUMU]', 'uygulanacak-hukuk': '[UYGULANACAK HUKUK VE YETKİLİ MAHKEME]', 'hukuki-sebep': '[HUKUKİ SEBEP — hukukçu belirleyecek]',
  'gunluk-suresi': '[GÜNLÜK SAKLAMA SÜRESİ]', 'eposta-saglayicisi': '[E-POSTA SAĞLAYICISI]', 'basvuru-saklama': '[BAŞVURU SAKLAMA SÜRESİ — hukukçu belirleyecek]',
  'barindirma-konumu': '[BARINDIRMA KONUMU]',
  'veri-toplama-yontemi': '[KİŞİSEL VERİ TOPLAMA YÖNTEMİ]',
};
const mailKey = 'destek-eposta-baglantisi';
const escapeHtml = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const emailPattern = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

export function validate(values) {
  const problems = [];
  const email = (values['destek-eposta'] ?? '').trim();
  if (email !== '' && !emailPattern.test(email)) problems.push('destek-eposta geçerli bir e-posta adresi değil.');
  for (const [key, value] of Object.entries(values)) if (!(key in labels) && key !== mailKey) problems.push(`Bilinmeyen alan: ${key}`);
  return problems;
}

export function applyToPage(html, values) {
  const email = (values['destek-eposta'] ?? '').trim();
  let out = html;
  for (const [key, label] of Object.entries(labels)) {
    const value = (values[key] ?? '').trim();
    const pattern = new RegExp(`<(?:mark data-placeholder|span data-filled)="${key}">[\\s\\S]*?</(?:mark|span)>`, 'g');
    out = out.replace(pattern, value === '' ? `<mark data-placeholder="${key}">${label}</mark>` : `<span data-filled="${key}">${escapeHtml(value)}</span>`);
  }
  // The e-mail request button: the placeholder is an attribute, not an element.
  out = out.replace(/<a class="button" data-(?:placeholder|filled)="destek-eposta-baglantisi" href="mailto:[^"]*\?subject=([^"]*)">/g, (_all, subject) =>
    email === '' ? `<a class="button" data-placeholder="${mailKey}" href="mailto:?subject=${subject}">` : `<a class="button" data-filled="${mailKey}" href="mailto:${escapeHtml(email)}?subject=${subject}">`);
  // Review status belongs to the private release checklist, never to public page copy.
  out = out.replace(/<!--taslak:start-->[\s\S]*?<!--taslak:end-->/g, '');
  return out;
}

export function setSupportEmail(source, email) {
  return source.replace(/(supportEmail["']?\s*:\s*)(["'])[^"']*\2/, (_all, head, quote) => `${head}${quote}${email}${quote}`);
}

export function missingValues(values) {
  return Object.keys(labels).filter((key) => (values[key] ?? '').trim() === '');
}

export function run(root, { check = false } = {}) {
  const file = join(root, 'docs/legal-values.json');
  const config = JSON.parse(readFileSync(file, 'utf8'));
  const values = config.degerler ?? {};
  const problems = validate(values);
  if (problems.length) { console.error(problems.join('\n')); return 2; }
  const missing = missingValues(values);
  const taslak = config.taslak !== false;
  if (check) {
    console.log(missing.length ? `Boş alanlar (${missing.length}): ${missing.join(', ')}` : 'Tüm alanlar dolu.');
    console.log(taslak ? '"taslak": true — mağaza için metin incelemesi bekleniyor.' : '"taslak": false — metin incelemesi tamamlandı olarak işaretlenmiş.');
    return missing.length ? 1 : 0;
  }
  for (const page of pages) {
    const path = join(root, 'apps/web/public/legal', `${page}.html`);
    writeFileSync(path, applyToPage(readFileSync(path, 'utf8'), values));
  }
  const email = (values['destek-eposta'] ?? '').trim();
  for (const path of ['config/brand.json']) {
    const full = join(root, path);
    if (existsSync(full)) writeFileSync(full, setSupportEmail(readFileSync(full, 'utf8'), email));
  }
  console.log(missing.length ? `Uygulandı. Hâlâ boş ${missing.length} alan: ${missing.join(', ')}` : 'Uygulandı. Tüm alanlar dolu.');
  console.log(taslak ? 'Metin incelemesi bekleniyor; mağaza ön kontrolünde engel olarak kalır.' : 'Metin incelemesi tamamlandı olarak işaretlenmiş.');
  return applyBrand(root);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exit(run(join(fileURLToPath(import.meta.url), '../..'), { check: process.argv.includes('--check') }));
}
