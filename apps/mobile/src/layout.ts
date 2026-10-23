import {
  contentMaxWidth,
  readingMaxWidth,
  space,
  windowClass,
} from "@oggaq/design-tokens";
import type { WindowClass } from "@oggaq/design-tokens";

// Layout follows the window width, not the device type (docs/DESIGN.md section 5): split screen, a foldable and a
// rotating tablet all use the same rules.
export type Layout = {
  cls: WindowClass;
  width: number;
  // Side gutter of a screen and padding inside a card.
  gutter: number;
  cardPadding: number;
  // Compact keeps the bottom tabs; medium and expanded use a navigation rail.
  railed: boolean;
  // Independent items (cards, exam rows) sit in this many columns.
  columns: 1 | 2;
  // The widest the whole content area may be (gutters included).
  maxWidth: number;
  // The widest reading column (a question, a form) inside it.
  readingWidth: number;
};

export function layoutFor(width: number): Layout {
  const cls = windowClass(width);
  const gutter =
    cls === "expanded"
      ? space.gutterExpanded
      : cls === "medium"
        ? space.gutterMedium
        : space.gutterCompact;
  return {
    cls,
    width,
    gutter,
    cardPadding: cls === "compact" ? space.cardPadding : space.cardPaddingWide,
    railed: cls !== "compact",
    columns: cls === "expanded" ? 2 : 1,
    maxWidth:
      (cls === "expanded" ? contentMaxWidth : readingMaxWidth) + 2 * gutter,
    readingWidth: readingMaxWidth + 2 * gutter,
  };
}

// The rail is part of the window: the content area is narrower by its width.
export const railWidth = 80;
