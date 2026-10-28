import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// GHSA-gcqx-w48m-w2h4: reject dangerous keys in BOTH merge loops and never invoke
// a prototype setter when copying a property. This is a local fix, not an upstream release.
const hashes = new Map([
  ['12440c84957c1990ea2d5e33dc0091722dc1dc1585c6d20e0c780e568ffa9d30', '1fcdc846db7741b35bfa5eff57900acb831787b38d384757f0d61144807926ed'],
  ['2e5160f84a1141bd927264afe4d15766f1e6cf07daef182b37ff53fea121de7d', '07695850b7cf6b1577f791e6971ba240dae0fc264f79bc139a24d2d2eea8a60a'],
  ['f33e6596482d1fb5c7c427f8ef92f2aa849eea9223acd974176b2fb27ddbf73a', 'd47770557954abac23d141341c78338018223b9f2001f2ca287a59aa0c64928d'],
]);
const hash = source => createHash('sha256').update(source).digest('hex');
export function patchedDeepmergeSource(source, version) {
  if (version !== '4.3.1') throw new Error('deepmerge sürümü değişti; güvenlik yaması yeniden incelenmeli.');
  if ([...hashes.values()].includes(hash(source))) return source;
  const expected = hashes.get(hash(source));
  if (!expected) throw new Error('deepmerge kaynağı beklenenle eşleşmiyor.');
  const patched = source
    .replace('function mergeObject(target, source, options) {', `function keyIsForbidden(key) {
\treturn key === '__proto__' || key === 'constructor' || key === 'prototype'
}

function setOwnProperty(target, key, value) {
\tObject.defineProperty(target, key, { value: value, writable: true, enumerable: true, configurable: true })
}

function mergeObject(target, source, options) {`)
    .replace('getKeys(target).forEach(function(key) {\n', 'getKeys(target).forEach(function(key) {\n\t\t\tif (keyIsForbidden(key)) return\n')
    .replace('if (propertyIsUnsafe(target, key)) {', 'if (keyIsForbidden(key) || propertyIsUnsafe(target, key)) {')
    .replace('destination[key] = cloneUnlessOtherwiseSpecified(target[key], options)', 'setOwnProperty(destination, key, cloneUnlessOtherwiseSpecified(target[key], options))')
    .replace('destination[key] = getMergeFunction(key, options)(target[key], source[key], options)', 'setOwnProperty(destination, key, getMergeFunction(key, options)(target[key], source[key], options))')
    .replace('destination[key] = cloneUnlessOtherwiseSpecified(source[key], options)', 'setOwnProperty(destination, key, cloneUnlessOtherwiseSpecified(source[key], options))');
  if (hash(patched) !== expected) throw new Error('deepmerge yamasının bütünlük kontrolü başarısız.');
  return patched;
}
export function installedDeepmerge() {
  const mobileRequire = createRequire(new URL('../apps/mobile/package.json', import.meta.url));
  const expoRequire = createRequire(mobileRequire.resolve('expo/package.json'));
  const configRequire = createRequire(expoRequire.resolve('@expo/config/package.json'));
  const root = path.dirname(configRequire.resolve('deepmerge/package.json'));
  return { filename: configRequire.resolve('deepmerge'), version: configRequire('deepmerge/package.json').version,
    files: ['index.js', 'dist/cjs.js', 'dist/umd.js'].map(file => path.join(root, file)) };
}
export function verifyDeepmergeSecurityPatch() {
  const { files, version } = installedDeepmerge();
  for (const filename of files) {
    const source = readFileSync(filename, 'utf8');
    if (patchedDeepmergeSource(source, version) !== source) throw new Error('deepmerge yaması eksik. Önce npm run security:prepare çalıştırın.');
  }
}
export function applyDeepmergeSecurityPatch() {
  const { files, version } = installedDeepmerge();
  const patches = files.map(filename => { const source = readFileSync(filename, 'utf8'); return { filename, source, patched: patchedDeepmergeSource(source, version) }; });
  for (const { filename, source, patched } of patches) if (patched !== source) writeFileSync(filename, patched);
  verifyDeepmergeSecurityPatch();
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  applyDeepmergeSecurityPatch();
  console.log('deepmerge 4.3.1: yerel prototype-poisoning yaması uygulandı ve doğrulandı.');
}
