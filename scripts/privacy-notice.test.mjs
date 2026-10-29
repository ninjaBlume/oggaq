import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'oggsor-notice-'));
  try {
    for (const dir of ['scripts', 'config', 'backend/config', 'apps/web/public/legal']) mkdirSync(join(root, dir), { recursive: true });
    cpSync(new URL('./privacy-notice.mjs', import.meta.url), join(root, 'scripts/privacy-notice.mjs'));
    const source = join(root, 'apps/web/public/legal/gizlilik.html');
    writeFileSync(source, '<h1>Örnek aydınlatma</h1>');
    const invoke = (...args) => spawnSync(process.execPath, [join(root, 'scripts/privacy-notice.mjs'), ...args], { encoding: 'utf8' });
    assert.equal(invoke('--version=2026-10-29.1').status, 0);
    run({ root, source, invoke });
  } finally { rmSync(root, { recursive: true, force: true }); }
}

test('notice check is read-only and detects archive tampering', () => fixture(({ root, invoke }) => {
  const manifest = join(root, 'config/privacy-notice.json');
  const original = readFileSync(manifest, 'utf8');
  assert.equal(invoke('--check').status, 0);
  assert.equal(readFileSync(manifest, 'utf8'), original);
  writeFileSync(join(root, 'apps/web/public/legal/privacy-notices/2026-10-29.1.html'), 'changed');
  assert.notEqual(invoke('--check').status, 0);
}));

test('changed notices require a new version and preserve old content and backend hashes', () => fixture(({ root, source, invoke }) => {
  writeFileSync(source, '<h1>Yeni aydınlatma</h1>');
  assert.notEqual(invoke('--version=2026-10-29.1').status, 0);
  assert.equal(invoke('--version=2026-10-29.2').status, 0);
  assert.equal(invoke('--check').status, 0);
  assert.equal(readFileSync(join(root, 'apps/web/public/legal/privacy-notices/2026-10-29.1.html'), 'utf8'), '<h1>Örnek aydınlatma</h1>');
  const php = readFileSync(join(root, 'backend/config/privacy_notices.php'), 'utf8');
  assert.match(php, /2026-10-29\.1/);
  assert.match(php, /2026-10-29\.2/);
}));

test('a stale backend notice manifest fails the release check', () => fixture(({ root, invoke }) => {
  writeFileSync(join(root, 'backend/config/privacy_notices.php'), '<?php return [];');
  assert.notEqual(invoke('--check').status, 0);
}));
