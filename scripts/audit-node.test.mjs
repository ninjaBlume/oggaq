import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inspectAudit } from './audit-node.mjs';
const tree = { dependencies: { '@oggaq/mobile': { dependencies: { expo: { dependencies: { '@expo/cli': { dependencies: { 'node-forge': {} } } } } } } } };
function report(name, id) {
  return { vulnerabilities: { [name]: { name, via: [{ url: `https://github.com/advisories/${id}` }] } } };
}
test('only the verified local forge fix on the Expo CLI path is recognized', () => {
  assert.deepEqual(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), tree, true), { patched: ['GHSA-86w9-cpqp-85rv'], failures: [] });
});
test('the known advisory still fails without a verified installed patch', () => {
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), tree, false).failures.length, 1);
});
test('Zod, old exceptions and new forge advisories are never waived', () => {
  for (const [name, id] of [['zod', 'GHSA-mrhx-c7xc-m3w5'], ['braces', 'GHSA-vfj7-8cjw-p6xm'], ['node-forge', 'GHSA-new-advisory']])
    assert.equal(inspectAudit(report(name, id), tree, true).failures.length, 1);
});
test('the same forge dependency outside Expo CLI fails even when a local copy is patched', () => {
  const unexpected = { dependencies: { ...tree.dependencies, '@oggaq/web': { dependencies: { 'node-forge': {} } } } };
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), unexpected, true).failures.length, 1);
});
test('the Expo signing helper is accepted only inside the reviewed CLI chain', () => {
  const signing = structuredClone(tree);
  signing.dependencies['@oggaq/mobile'].dependencies.expo.dependencies['@expo/cli'].dependencies['@expo/code-signing-certificates'] = { dependencies: { 'node-forge': {} } };
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), signing, true).failures.length, 0);
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), { dependencies: { '@expo/code-signing-certificates': { dependencies: { 'node-forge': {} } } } }, true).failures.length, 1);
});
test('a clean registry report is accepted without inventing advisory exceptions', () => {
  assert.deepEqual(inspectAudit({ vulnerabilities: {} }, tree, true), { patched: [], failures: [] });
});
test('the OTA signing helper uses the same verified patch and no other update dependency is exempt', () => {
  const updates = { dependencies: { '@oggaq/mobile': { dependencies: { 'expo-updates': { dependencies: { '@expo/code-signing-certificates': { dependencies: { 'node-forge': {} } } } } } } } };
  assert.deepEqual(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), updates, true).failures, []);
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), updates, false).failures.length, 1);
  updates.dependencies['@oggaq/mobile'].dependencies['expo-updates'].dependencies['node-forge'] = {};
  assert.equal(inspectAudit(report('node-forge', 'GHSA-86w9-cpqp-85rv'), updates, true).failures.length, 1);
});
