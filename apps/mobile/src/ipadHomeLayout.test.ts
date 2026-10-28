import { describe, expect, it } from 'vitest';
import { ipadHomeLayoutFor } from './ipadHomeLayout';

const presentation = (platform: string, isPad: boolean, contentWidth: number, largeText = false) =>
  ipadHomeLayoutFor({ platform, isPad, contentWidth, largeText });

describe('iPad-only home layout', () => {
  it('keeps iPhone, Android tablets and web out at every window size', () => {
    for (const [platform, isPad] of [['ios', false], ['android', true], ['android', false], ['web', true]] as const)
      for (const width of [320, 692, 960, 1120])
        for (const large of [false, true])
          expect(presentation(platform, isPad, width, large)).toEqual({ enabled: false, twoColumns: false, verticalMetrics: false });
  });
  it('fits two readable panels on an 11-inch iPad and in landscape', () => {
    for (const width of [692, 706, 888, 1120]) expect(presentation('ios', true, width).twoColumns).toBe(true);
    expect(presentation('ios', true, 659).twoColumns).toBe(false);
    expect(presentation('ios', true, 660).twoColumns).toBe(true);
  });
  it('stacks split-screen panels and very narrow metric cards', () => {
    expect(presentation('ios', true, 460)).toEqual({ enabled: true, twoColumns: false, verticalMetrics: true });
    expect(presentation('ios', true, 640)).toEqual({ enabled: true, twoColumns: false, verticalMetrics: false });
  });
  it('reserves more room for large text instead of clipping narrow columns', () => {
    expect(presentation('ios', true, 706, true)).toEqual({ enabled: true, twoColumns: false, verticalMetrics: true });
    expect(presentation('ios', true, 959, true).twoColumns).toBe(false);
    expect(presentation('ios', true, 960, true).twoColumns).toBe(true);
  });
});
