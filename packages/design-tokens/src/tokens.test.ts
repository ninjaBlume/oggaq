import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { colorRoles, darkPalette, lightPalette, resolveScheme, windowClass } from './index.ts';
import type { ColorRole } from './index.ts';
import { contrastRatio } from './contrast.ts';
import { cssTokens } from './css.ts';

// [foreground, background, minimum ratio]: 4.5 for text, 3 for large text, icons and graphics (WCAG 2.2 AA).
const pairs: [ColorRole, ColorRole, number][] = [
  ['ink', 'paper', 4.5], ['ink', 'surface', 4.5], ['ink', 'surfaceContainer', 4.5], ['ink', 'softPrimary', 4.5],
  ['muted', 'paper', 4.5], ['muted', 'surface', 4.5], ['muted', 'surfaceContainer', 4.5], ['muted', 'neutralSurface', 4.5],
  ['primary', 'paper', 4.5], ['primary', 'surface', 4.5], ['primary', 'softPrimary', 4.5],
  ['onPrimary', 'primary', 4.5], ['onPrimaryContainer', 'primaryContainer', 4.5], ['onSecondaryContainer', 'secondaryContainer', 4.5],
  ['success', 'surface', 4.5], ['success', 'softSuccess', 4.5], ['red', 'surface', 4.5], ['red', 'softRed', 4.5],
  ['warning', 'surface', 4.5], ['warning', 'softWarning', 4.5],
  ['onNavy', 'navy', 4.5], ['onNavyMuted', 'navy', 4.5], ['accent', 'navy', 3],
  ['red', 'paper', 3], ['success', 'paper', 3],
];

describe.each([['light', lightPalette], ['dark', darkPalette]] as const)('%s palette', (_scheme, palette) => {
  it.each(pairs)('%s on %s reaches %s:1', (foreground, background, minimum) => {
    expect(contrastRatio(palette[foreground], palette[background])).toBeGreaterThanOrEqual(minimum);
  });
  it('defines every role', () => {
    for (const role of colorRoles) expect(palette[role], role).toBeTruthy();
  });
});

describe('theme helpers', () => {
  it('follows the device only for the system preference', () => {
    expect(resolveScheme('system', 'dark')).toBe('dark');
    expect(resolveScheme('system', null)).toBe('light');
    expect(resolveScheme('light', 'dark')).toBe('light');
    expect(resolveScheme('dark', 'light')).toBe('dark');
  });
  it('classifies window widths', () => {
    expect([320, 599, 600, 839, 840, 1280].map(windowClass)).toEqual(['compact', 'compact', 'medium', 'medium', 'expanded', 'expanded']);
  });
});

describe('tokens.css', () => {
  it('is generated from the palette', () => {
    expect(readFileSync(fileURLToPath(new URL('../tokens.css', import.meta.url)), 'utf8')).toBe(cssTokens());
  });
});
