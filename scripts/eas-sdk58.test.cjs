const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { compatibleConfigPlugins } = require('./eas-sdk58.cjs');
const { IOSConfig } = require('@expo/config-plugins');
const brand = require('../config/brand.json');
const cliRoot = path.resolve('/tool/eas-cli');
const legacy = { IOSConfig: { XcodeUtils: { sanitizedName: name => name.replace(/[\W_]+/g, ''), other: () => 'unchanged' }, other: 'preserved' }, other: 'preserved' };
test('EAS iOS metadata keeps Turkish brand names equal to the real SDK 58 native identifier', () => {
  const converted = compatibleConfigPlugins('@expo/config-plugins', path.join(cliRoot, 'build/project/ios/scheme.js'), legacy, cliRoot, IOSConfig.XcodeUtils.sanitizedName);
  assert.equal(converted.IOSConfig.XcodeUtils.sanitizedName(brand.displayName), 'OGGSORSoruBankasi');
  assert.notEqual(legacy.IOSConfig.XcodeUtils.sanitizedName(brand.displayName), 'OGGSORSoruBankasi');
  assert.equal(converted.IOSConfig.XcodeUtils.other, legacy.IOSConfig.XcodeUtils.other);
  assert.equal(converted.other, legacy.other);assert.equal(converted.IOSConfig.other, legacy.IOSConfig.other);
});
test('the managed bundle identifier assertion gets the same conversion as the scheme resolver', () => {
  const converted = compatibleConfigPlugins('@expo/config-plugins', path.join(cliRoot, 'build/project/ios/bundleIdentifier.js'), legacy, cliRoot, IOSConfig.XcodeUtils.sanitizedName);
  for (const name of ['ÖGG SOR - Soru Bankası', 'ÖGG SOR Önizleme', 'Plain App']) assert.equal(converted.IOSConfig.XcodeUtils.sanitizedName(name), IOSConfig.XcodeUtils.sanitizedName(name));
});
test('Android, other packages, and application runtime modules are untouched', () => {
  for (const [request, parent] of [['@expo/config-plugins', path.join(cliRoot, 'build/project/android/config.js')], ['@expo/config-plugins', '/app/ios/runtime.js'], ['another-package', path.join(cliRoot, 'build/project/ios/scheme.js')]]) assert.equal(compatibleConfigPlugins(request, parent, legacy, cliRoot, IOSConfig.XcodeUtils.sanitizedName), legacy);
});
