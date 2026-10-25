import assert from 'node:assert/strict';
import { test } from 'node:test';
import { applyToPage, draftBanner, labels, missingValues, setSupportEmail, validate } from './apply-legal-values.mjs';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const page = `<body><!--taslak:start-->${draftBanner}<!--taslak:end--><p><mark data-placeholder="destek-eposta">${labels['destek-eposta']}</mark> ve <mark data-placeholder="verbis">${labels.verbis}</mark></p><a class="button" data-placeholder="destek-eposta-baglantisi" href="mailto:?subject=Silme%20talebi">Gönder</a></body>`;

test('fills values, escapes HTML and builds the mailto link', () => {
  const out = applyToPage(page, { 'destek-eposta': 'destek@ornek.com', verbis: 'a <b> & "c"' }, true);
  assert.match(out, /<span data-filled="destek-eposta">destek@ornek.com<\/span>/);
  assert.match(out, /<span data-filled="verbis">a &lt;b&gt; &amp; &quot;c&quot;<\/span>/);
  assert.match(out, /data-filled="destek-eposta-baglantisi" href="mailto:destek@ornek.com\?subject=Silme%20talebi"/);
  assert.doesNotMatch(out, /data-placeholder/);
});

test('is idempotent and an emptied value restores the marked placeholder', () => {
  const values = { 'destek-eposta': 'a@b.co', verbis: 'istisna' };
  const once = applyToPage(page, values, true);
  assert.equal(applyToPage(once, values, true), once);
  const changed = applyToPage(once, { ...values, verbis: 'yeni' }, true);
  assert.match(changed, /data-filled="verbis">yeni</);
  const emptied = applyToPage(once, { 'destek-eposta': '', verbis: '' }, true);
  assert.match(emptied, /<mark data-placeholder="verbis">\[VERBİS KAYIT DURUMU\]<\/mark>/);
  assert.match(emptied, /data-placeholder="destek-eposta-baglantisi" href="mailto:\?subject=/);
});

test('draft banner follows the taslak flag in both directions', () => {
  const without = applyToPage(page, {}, false);
  assert.doesNotMatch(without, /taslak-bandi/);
  assert.match(applyToPage(without, {}, true), /id="taslak-bandi"/);
});

test('validation and missing list', () => {
  assert.deepEqual(validate({ 'destek-eposta': 'yok' }), ['destek-eposta geçerli bir e-posta adresi değil.']);
  assert.deepEqual(validate({ olmayan: 'x' }), ['Bilinmeyen alan: olmayan']);
  assert.deepEqual(validate({ 'destek-eposta': 'a@b.co' }), []);
  assert.ok(missingValues({}).includes('verbis'));
  assert.ok(!missingValues({ verbis: 'x' }).includes('verbis'));
});

test('support e-mail is written into brand.json and config.ts', () => {
  assert.equal(setSupportEmail('{"supportEmail":""}', 'a@b.co'), '{"supportEmail":"a@b.co"}');
  assert.equal(setSupportEmail("export const brand = { supportEmail: '' };", 'a@b.co'), "export const brand = { supportEmail: 'a@b.co' };");
  assert.equal(setSupportEmail('{"supportEmail":"eski@b.co"}', ''), '{"supportEmail":""}');
});

test('legal --check never writes brand or legal pages', () => {
  const root = mkdtempSync(join(tmpdir(), 'legal-readonly-'));
  try {
    mkdirSync(join(root, 'docs'));
    mkdirSync(join(root, 'config'));
    const values = JSON.stringify({ taslak: true, degerler: { 'destek-eposta': '' } });
    const brand = '{"supportEmail":"old@example.test"}';
    writeFileSync(join(root, 'docs/legal-values.json'), values);
    writeFileSync(join(root, 'config/brand.json'), brand);
    const script = new URL('./apply-legal-values.mjs', import.meta.url).href;
    const result = spawnSync(process.execPath, ['--input-type=module', '-e', `import { run } from ${JSON.stringify(script)}; process.exit(run(process.argv[1], {check:true}));`, root], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stdout, /Boş alanlar/);
    assert.equal(readFileSync(join(root, 'config/brand.json'), 'utf8'), brand);
    assert.equal(readFileSync(join(root, 'docs/legal-values.json'), 'utf8'), values);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
