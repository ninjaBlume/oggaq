import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { patchedForgeSource, verifyForgeSecurityPatch } from './forge-security-patch.mjs';
const rootRequire = createRequire(import.meta.url);
const expoRequire = createRequire(rootRequire.resolve('expo/package.json'));
const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
const patched = readFileSync(cliRequire.resolve('node-forge/lib/rsa.js'), 'utf8');
test('reapplying the security patch is idempotent and the installed source is verified', () => {
  assert.equal(patchedForgeSource(patched, '1.4.0'), patched);
  verifyForgeSecurityPatch();
});
test('the known upstream source is patched reproducibly', () => {
  const original = patched.replace("            obj.value.length !== 2 ||\n            obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)) {", '            obj.value.length !== 2) {');
  assert.notEqual(original, patched);
  assert.equal(patchedForgeSource(original, '1.4.0'), patched);
});
test('modified source or an unreviewed package version fails closed', () => {
  assert.throws(() => patchedForgeSource(patched + '\n// unexpected change', '1.4.0'), /eşleşmiyor/);
  assert.throws(() => patchedForgeSource(patched, '1.4.1'), /yeniden incelenmeli/);
});
