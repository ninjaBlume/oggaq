import {
  darkPalette,
  lightPalette,
  palettes as tokenPalettes,
  shape as tokenShape,
  typeScale,
} from "@oggaq/design-tokens";
import type { ColorScheme, Palette } from "@oggaq/design-tokens";
import { scoreBand } from "@oggaq/study-core";

// Colours are semantic roles with a light and a dark value (packages/design-tokens). Components never name a hex: they
// read the active palette from useTheme() (themeContext.tsx). Only the thin decorative ring on navy is local.
export type AppPalette = Palette & { decorativeLine: string };
const decorativeLine = "rgba(255, 255, 255, 0.18)";
export const palettes: Record<ColorScheme, AppPalette> = {
  light: { ...tokenPalettes.light, decorativeLine },
  dark: { ...tokenPalettes.dark, decorativeLine },
};
export { darkPalette, lightPalette };

export const shape = { ...tokenShape, connected: 6, control: 16, controlPressed: 12 } as const;

export const typography = {
  ...typeScale,
  headline: { ...typeScale.headline, fontSize: 26, lineHeight: 33, letterSpacing: -0.5 },
  caption: { fontSize: 14, lineHeight: 21 },
} as const;

// A score is tinted by its band (60-point mark and 80, see scoreBand): green strong, blue steady, red weak. Colour and
// tone only; nothing says passed or failed.
export function scoreTone(score: number, palette: AppPalette) {
  const band = scoreBand(score);
  return band === "strong"
    ? { backgroundColor: palette.softSuccess, color: palette.success, badge: "success" as const }
    : band === "steady"
      ? { backgroundColor: palette.softPrimary, color: palette.primary, badge: "primary" as const }
      : { backgroundColor: palette.softRed, color: palette.red, badge: "red" as const };
}

// Material 3 Expressive v0_14_0 spring values, adapted to RN's unit-mass model.
// damping = 2 * dampingRatio * sqrt(stiffness * mass).
// https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt
export const motion = {
  fastSpatial: { stiffness: 800, damping: 2 * 0.6 * Math.sqrt(800), mass: 1 },
  spatial: { stiffness: 380, damping: 2 * 0.8 * Math.sqrt(380), mass: 1 },
  effects: { stiffness: 1600, damping: 2 * Math.sqrt(1600), mass: 1 },
};
