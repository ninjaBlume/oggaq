import assert from 'node:assert/strict';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const eas = JSON.parse(readFileSync(new URL('../apps/mobile/eas.json', import.meta.url), 'utf8'));
function config(preview = false) {
  return JSON.parse(execFileSync(process.execPath, ['-e',
    'console.log(JSON.stringify(require("@expo/config").getConfig("apps/mobile").exp))'], {
    cwd: root, encoding: 'utf8', env: { ...process.env,
      EXPO_PUBLIC_LOCAL_PREVIEW: preview ? '1' : '0',
      EXPO_PUBLIC_API_URL: preview ? 'http://127.0.0.1:8001' : 'https://oggsor.com',
      EXPO_PUBLIC_WEB_URL: 'https://oggsor.com',
    },
  }));
}
const beta = config();
test('OTA compatibility follows native fingerprints and the existing EAS project', () => {
  assert.deepEqual(beta.runtimeVersion, { policy: 'fingerprint' });
  assert.equal(beta.updates.url, `https://u.expo.dev/${beta.extra.eas.projectId}`);
  assert.equal(beta.updates.enabled, true);
});
test('update checks never wait at startup and keep the embedded recovery bundle', () => {
  assert.equal(beta.updates.fallbackToCacheTimeout, 0);
  assert.equal(beta.updates.checkAutomatically, 'ON_LOAD');
  assert.equal(beta.updates.useEmbeddedUpdate, true);
  assert.notEqual(beta.updates.disableAntiBrickingMeasures, true);
});
test('local browser previews cannot consume beta updates', () => {
  assert.equal(config(true).updates.enabled, false);
});
test('TestFlight and public store packages use different update channels', () => {
  assert.equal(eas.build.testflight.channel, 'testflight');
  assert.equal(eas.build.testflight.environment, 'preview');
  assert.equal(eas.build.production.channel, 'production');
  assert.notEqual(eas.build.testflight.channel, eas.build.production.channel);
  assert.equal(eas.build.production.env.EXPO_PUBLIC_LOCAL_PREVIEW, '0');
  assert.equal(eas.build.testflight.extends, 'production');
});
