// Only the native iPad home opts in. Width alone must never change iPhone, Android or web.
export function ipadHomeLayoutFor({ platform, isPad, contentWidth, largeText }: {
  platform: string;
  isPad: boolean;
  contentWidth: number;
  largeText: boolean;
}) {
  const enabled = platform === 'ios' && isPad;
  const twoColumns = enabled && contentWidth >= (largeText ? 960 : 660);
  return { enabled, twoColumns, verticalMetrics: enabled && (twoColumns || contentWidth < 520 || largeText) };
}
