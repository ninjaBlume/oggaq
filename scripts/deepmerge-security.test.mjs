import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';
import { installedDeepmerge, patchedDeepmergeSource, verifyDeepmergeSecurityPatch } from './deepmerge-security-patch.mjs';

const { filename } = installedDeepmerge();
const source = readFileSync(filename, 'utf8');
const require = createRequire(filename);
const merge = require(filename);
function load(text) {
  const module = { exports: {} };
  vm.runInNewContext(text, { module, exports: module.exports, require });
  return module.exports;
}
test('installed patch is exact, repeatable, and rejects changed source or version', () => {
  verifyDeepmergeSecurityPatch();
  assert.equal(patchedDeepmergeSource(source, '4.3.1'), source);
  assert.throws(() => patchedDeepmergeSource(source + '\n', '4.3.1'), /eşleşmiyor/);
  assert.throws(() => patchedDeepmergeSource(source, '4.3.2'), /yeniden incelenmeli/);
});
test('the reported null-placeholder attack is reproduced on upstream and prevented on installed source', () => {
  const original = source.replace(/function keyIsForbidden\(key\) \{[\s\S]*?function mergeObject\(target, source, options\) \{/, 'function mergeObject(target, source, options) {')
    .replace('\t\t\tif (keyIsForbidden(key)) return\n', '').replace('keyIsForbidden(key) || ', '')
    .replace('setOwnProperty(destination, key, cloneUnlessOtherwiseSpecified(target[key], options))', 'destination[key] = cloneUnlessOtherwiseSpecified(target[key], options)')
    .replace('setOwnProperty(destination, key, getMergeFunction(key, options)(target[key], source[key], options))', 'destination[key] = getMergeFunction(key, options)(target[key], source[key], options)')
    .replace('setOwnProperty(destination, key, cloneUnlessOtherwiseSpecified(source[key], options))', 'destination[key] = cloneUnlessOtherwiseSpecified(source[key], options)');
  assert.equal(patchedDeepmergeSource(original, '4.3.1'), source);
  const attack = JSON.parse('{"session":{"__proto__":{"admin":true}}}');
  assert.equal(load(original)({ session: null }, attack).session.admin, true);
  assert.equal(merge({ session: null }, attack).session.admin, undefined);
  assert.equal({}.admin, undefined);
});
test('source, target, null prototypes and nested arrays cannot copy dangerous keys', () => {
  for (const key of ['__proto__', 'constructor', 'prototype']) {
    const attack = JSON.parse(`{"${key}":{"admin":true},"safe":42}`);
    for (const result of [merge(Object.create(null), attack), merge(attack, {}), merge({}, { nested: [attack] }).nested[0]]) {
      assert.equal(Object.getPrototypeOf(result), Object.prototype);
      assert.equal(result.admin, undefined);
      assert.equal(Object.hasOwn(result, key), false);
      assert.equal(result.safe, 42);
    }
  }
});
test('normal Expo-style config, symbols, arrays, customMerge and clone=false remain compatible', () => {
  const sym = Symbol('fixture');
  const input = { plugins: ['font'], extra: { apiUrl: 'https://example.test', [sym]: 42 }, date: new Date(0), regex: /test/ };
  const output = merge(input, { plugins: ['updates'], extra: { preview: false } });
  assert.deepEqual(output.plugins, ['font', 'updates']);
  assert.equal(output.extra[sym], 42);
  assert.equal(output.extra.apiUrl, input.extra.apiUrl);
  assert.equal(output.date, input.date);
  assert.equal(output.regex, input.regex);
  assert.notEqual(output.extra, input.extra);
  assert.equal(merge({}, input, { clone: false }).extra, input.extra);
  assert.deepEqual(merge({ plugins: ['a'] }, { plugins: ['b'] }, { customMerge: key => key === 'plugins' ? (_a, b) => b : undefined }).plugins, ['b']);
});
