import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Backport of the nested DigestAlgorithm element-count check discussed in
// https://github.com/digitalbazaar/forge/pull/1152 (not yet in an npm release).
// Exact source hashes prevent silently patching an upgraded or modified dependency.
const beforeHash = 'fd4740238145ec26470eb3f06a627c72039538ce1307dbdce40521f94dfd0a50';
const afterHash = '447c5441cea1b125e23661d7e27a8b1759cc3400241c0013b2d034b4ee1dbf50';
const hash = source => createHash('sha256').update(source).digest('hex');
export function patchedForgeSource(source, version) {
  if (version !== '1.4.0') throw new Error('node-forge sürümü değişti; yerel güvenlik yaması yeniden incelenmeli.');
  if (hash(source) === afterHash) return source;
  if (hash(source) !== beforeHash) throw new Error('node-forge rsa.js beklenen kaynakla eşleşmiyor; yama uygulanmadı.');
  const patched = source.replace('            obj.value.length !== 2) {',
    "            obj.value.length !== 2 ||\n            obj.value[0].value.length !== (('parameters' in capture) ? 2 : 1)) {");
  if (hash(patched) !== afterHash) throw new Error('node-forge güvenlik yamasının bütünlük kontrolü başarısız.');
  return patched;
}
function installedForges() {
  const mobileRequire = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
  const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
  const cliRequire = createRequire(expoRequire.resolve('@expo/cli/package.json'));
  const signingRequire = createRequire(cliRequire.resolve('@expo/code-signing-certificates/package.json'));
  const updatesRequire = createRequire(mobileRequire.resolve('expo-updates/package.json'));
  const updateSigningRequire = createRequire(updatesRequire.resolve('@expo/code-signing-certificates/package.json'));
  const files = new Map();
  for (const loader of [cliRequire, signingRequire, updateSigningRequire]) {
    const filename = loader.resolve('node-forge/lib/rsa.js');
    files.set(filename, { version: loader('node-forge/package.json').version, filename });
  }
  return [...files.values()];
}
export function verifyForgeSecurityPatch() {
  for (const { version, filename } of installedForges()) {
    const source = readFileSync(filename, 'utf8');
    patchedForgeSource(source, version);
    if (hash(source) !== afterHash) throw new Error('node-forge güvenlik yaması eksik. Önce npm run security:prepare çalıştırın.');
  }
}
export function applyForgeSecurityPatch() {
  for (const { version, filename } of installedForges()) {
    const source = readFileSync(filename, 'utf8');
    const patched = patchedForgeSource(source, version);
    if (source !== patched) writeFileSync(filename, patched);
  }
  verifyForgeSecurityPatch();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  applyForgeSecurityPatch();
  console.log('node-forge 1.4.0: CVE-2026-85393 yerel yaması uygulandı ve doğrulandı.');
}
