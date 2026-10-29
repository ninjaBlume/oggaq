import { expect, it } from 'vitest';
import { checkReachability } from './reachability';

it('recognizes an unavailable or reachable server without writing an exam', async () => {
  expect(await checkReachability(async () => ({ status: 200 }))).toBe(true);
  expect(await checkReachability(async () => ({ status: 503 }))).toBe(false);
  expect(await checkReachability(async () => ({ status: 429 }))).toBe(true);
  expect(await checkReachability(async () => { throw new TypeError('network'); })).toBe(false);
});
it('treats a timed-out network probe as unavailable', async () => {
  expect(await checkReachability(signal => new Promise((_resolve, reject) => signal.addEventListener('abort', () => reject(new Error('timeout')))), 5)).toBe(false);
});

it('times out even when a network implementation ignores abort', async () => {
  expect(await checkReachability(() => new Promise(() => {}), 5)).toBe(false);
});
