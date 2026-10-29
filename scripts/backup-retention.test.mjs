import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

test('backup retention enforces calendar age even for sparse backups; retains the current erasure ledger', () => {
  const dir = mkdtempSync(join(tmpdir(), 'oggsor-retention-'));
  const name = (days, prefix = 'oggaq-oggaq', suffix = 'dump.age') => {
    const day = new Date(); day.setUTCDate(day.getUTCDate() - days);
    return `${prefix}-${day.toISOString().slice(0, 10).replaceAll('-', '')}T000000Z.${suffix}`;
  };
  try {
    const recent = name(0), within = name(30), boundary = name(35), ancient = name(500);
    const ledger = name(500, 'erasures', 'ndjson.age');
    const staleLedger = name(501, 'erasures', 'ndjson.age');
    for (const file of [recent, within, boundary, ancient, ledger, staleLedger]) {
      writeFileSync(join(dir, file), 'synthetic encrypted fixture');
      writeFileSync(join(dir, file+'.sha256'), 'fixture');
    }
    writeFileSync(join(dir, 'LATEST-ERASURES'), `name=${ledger}\n`);
    writeFileSync(join(dir, 'unrelated.keep'), 'keep');
    const invoke = (...args) => spawnSync('bash', [resolve('deploy/backup/prune.sh'), dir, ...args], { encoding: 'utf8', env: { ...process.env, KEEP_DAILY: '99', KEEP_WEEKLY: '99', KEEP_MONTHLY: '99', BACKUP_MAX_DAYS: '35' } });
    assert.equal(invoke('--dry-run').status, 0);
    assert.ok(existsSync(join(dir, ancient)));
    const applied = invoke();
    assert.equal(applied.status, 0, applied.stderr);
    for (const file of [recent, within, ledger, 'unrelated.keep', 'LATEST-ERASURES']) assert.ok(existsSync(join(dir, file)), file);
    for (const file of [ancient, boundary, staleLedger]) assert.ok(!existsSync(join(dir, file)), file);
    assert.ok(!readdirSync(dir).includes(ancient+'.sha256'));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
