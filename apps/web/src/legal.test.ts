import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The static legal pages cannot import the design tokens, so public/legal/tokens.css is a copy of the generated file.
describe('public legal pages', () => {
  it('use the same design tokens as the apps', () => {
    const copy = readFileSync(new URL('../public/legal/tokens.css', import.meta.url), 'utf8');
    const source = readFileSync(new URL('../../../packages/design-tokens/tokens.css', import.meta.url), 'utf8');
    expect(copy).toBe(source);
  });
  it('load only same-origin files (production CSP is default-src self, script-src self)', () => {
    for (const page of ['gizlilik', 'kosullar', 'destek', 'hesap-silme']) {
      const html = readFileSync(new URL(`../public/legal/${page}.html`, import.meta.url), 'utf8');
      expect(html).not.toMatch(/<script(?![^>]*\ssrc=)/);
      expect(html).not.toMatch(/\sstyle=/);
      expect(html).not.toMatch(/(src|href)="https?:\/\//);
    }
  });
});
