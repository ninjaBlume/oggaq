// Native iPads and phone-sized landscape windows share the home presentation.
// Portrait phones, Android tablets in portrait, and web keep their existing layout.
export function homePresentationFor({ platform, isPad, windowWidth, windowHeight, contentWidth, largeText }: {
  platform: string;
  isPad: boolean;
  windowWidth: number;
  windowHeight: number;
  contentWidth: number;
  largeText: boolean;
}) {
  const native = platform === 'ios' || platform === 'android';
  const compactLandscape = native && windowWidth > windowHeight && windowHeight < 600;
  const enabled = (platform === 'ios' && isPad) || compactLandscape;
  const twoColumns = enabled && contentWidth >= (largeText ? 960 : compactLandscape ? 600 : 660);
  return { enabled, twoColumns, compactLandscape, verticalMetrics: enabled && (twoColumns || contentWidth < 520 || largeText) };
}
