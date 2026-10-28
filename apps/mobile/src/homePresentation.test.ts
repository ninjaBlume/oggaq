import { describe, expect, it } from 'vitest';
import { homePresentationFor } from './homePresentation';
import { layoutFor, railWidth } from './layout';

function presentation(platform: string, width: number, height: number, {
  isPad = false, largeText = false, horizontalInsets = 0,
} = {}) {
  const layout = layoutFor(width);
  const contentWidth = Math.min(width - horizontalInsets - (layout.railed ? railWidth : 0), layout.maxWidth) - 2 * layout.gutter;
  return homePresentationFor({ platform, isPad, windowWidth: width, windowHeight: height, contentWidth, largeText });
}

describe('native home presentation', () => {
  it('preserves portrait phones and web in either orientation', () => {
    for (const platform of ['ios', 'android', 'web'])
      for (const largeText of [false, true])
        expect(presentation(platform, 390, 844, { largeText })).toMatchObject({ enabled: false, compactLandscape: false });
    expect(presentation('web', 956, 440)).toMatchObject({ enabled: false, compactLandscape: false });
    expect(presentation('android', 834, 1194)).toMatchObject({ enabled: false, compactLandscape: false });
  });
  it('enables iPhone and Android landscape, reserving room for cutouts and the navigation rail', () => {
    for (const platform of ['ios', 'android']) {
      expect(presentation(platform, 956, 440, { horizontalInsets: 124 })).toEqual({ enabled: true, twoColumns: true, compactLandscape: true, verticalMetrics: true });
      // Not enough space for readable columns on a smaller landscape phone.
      expect(presentation(platform, 812, 375, { horizontalInsets: 100 }).twoColumns).toBe(false);
    }
  });
  it('returns to the original presentation when the phone is rotated upright', () => {
    for (const platform of ['ios', 'android']) {
      expect(presentation(platform, 956, 440).enabled).toBe(true);
      expect(presentation(platform, 440, 956)).toEqual({ enabled: false, twoColumns: false, compactLandscape: false, verticalMetrics: false });
    }
  });
  it('keeps the existing iPad portrait and landscape presentation', () => {
    for (const [width, height] of [[820, 1180], [1180, 820]])
      expect(presentation('ios', width, height, { isPad: true })).toEqual({ enabled: true, twoColumns: true, compactLandscape: false, verticalMetrics: true });
  });
  it('uses available content width at the phone and iPad split boundaries', () => {
    const props = { platform: 'ios', isPad: false, windowWidth: 900, windowHeight: 400, largeText: false };
    expect(homePresentationFor({ ...props, contentWidth: 599 }).twoColumns).toBe(false);
    expect(homePresentationFor({ ...props, contentWidth: 600 }).twoColumns).toBe(true);
    expect(homePresentationFor({ ...props, isPad: true, windowHeight: 1200, contentWidth: 659 }).twoColumns).toBe(false);
    expect(homePresentationFor({ ...props, isPad: true, windowHeight: 1200, contentWidth: 660 }).twoColumns).toBe(true);
  });
  it('stacks narrow iPad windows and metric cards without forcing columns', () => {
    expect(presentation('ios', 488, 820, { isPad: true })).toEqual({ enabled: true, twoColumns: false, compactLandscape: false, verticalMetrics: true });
    expect(presentation('ios', 768, 1024, { isPad: true })).toEqual({ enabled: true, twoColumns: false, compactLandscape: false, verticalMetrics: false });
  });
  it('reserves wider columns for large text on phones and iPads', () => {
    for (const platform of ['ios', 'android'])
      expect(presentation(platform, 956, 440, { largeText: true })).toMatchObject({ enabled: true, twoColumns: false, verticalMetrics: true });
    expect(presentation('ios', 820, 1180, { isPad: true, largeText: true }).twoColumns).toBe(false);
    expect(presentation('ios', 1180, 820, { isPad: true, largeText: true }).twoColumns).toBe(true);
  });
});
