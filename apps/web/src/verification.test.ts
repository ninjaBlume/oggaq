import { describe, expect, it } from 'vitest';
import { verificationInput } from './verification';
const valid = () => new URLSearchParams({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', hash: 'a'.repeat(40), signature: 'b'.repeat(64), expires: '1800000000' });
describe('signed email link parsing', () => {
  it('parses only the server verification fields', () => {
    const search = valid(); search.set('url', 'https://untrusted.example');
    expect(verificationInput(search)).toEqual({ id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', hash: 'a'.repeat(40), signature: 'b'.repeat(64), expires: 1800000000 });
  });
  it('rejects missing fields and path injection', () => {
    expect(verificationInput(new URLSearchParams())).toBeNull();
    const search = valid(); search.set('id', '../other-account');
    expect(verificationInput(search)).toBeNull();
  });
  it('rejects malformed signatures and non-integer expiry', () => {
    for (const [key, value] of [['signature', 'wrong'], ['hash', 'wrong'], ['expires', 'Infinity'], ['expires', '1.2'], ['expires', '-1'], ['expires', '0']]) {
      const search = valid(); search.set(key, value); expect(verificationInput(search)).toBeNull();
    }
  });
  it('leaves expired signed links for backend verification', () => {
    const search = valid(); search.set('expires', '1'); expect(verificationInput(search)?.expires).toBe(1);
  });
});
