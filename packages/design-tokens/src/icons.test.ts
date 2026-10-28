import { describe, expect, it } from 'vitest';
import { featureIconNames, iconNodes } from './icons';

describe('shared UI icon registry', () => {
  it('keeps different feature destinations from silently reusing the same artwork', () => {
    const drawings=featureIconNames.map(name=>JSON.stringify(iconNodes[name]));
    expect(new Set(drawings).size).toBe(featureIconNames.length);
  });
  it('only contains nonempty, safe SVG primitives usable by web and admin renderers', () => {
    const primitives=['path','rect','circle','line','ellipse','polyline','polygon'];
    for(const nodes of Object.values(iconNodes)) {
      expect(nodes.length).toBeGreaterThan(0);
      for(const [tag,attributes] of nodes) {
        expect(primitives).toContain(tag);
        expect(Object.keys(attributes).length).toBeGreaterThan(0);
        expect(Object.keys(attributes).some(key=>/^on|href|style|innerHTML/i.test(key))).toBe(false);
      }
    }
  });
});
