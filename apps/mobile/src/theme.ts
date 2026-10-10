// Semantic roles keep branding, actions and answer feedback distinct.
export const palette = {
  ink: "#202B38",
  muted: "#667085",
  primary: "#0F766E",
  paper: "#F7F8F6",
  line: "#E2E7E5",
  white: "#FFFFFF",
  red: "#B9384A",
  success: "#237A4B",
  softPrimary: "#E7F2EF",
  softSuccess: "#EDF5EF",
  softRed: "#FBEDEF",
  navy: "#182B45",
  accent: "#D6A64F",
  onNavyMuted: "#C6D2DF",
  neutralSurface: "#ECEFEC",
  scrim: "rgba(24, 43, 69, 0.48)",
  decorativeLine: "rgba(255, 255, 255, 0.18)",
  primaryContainer: "#CDE8DF",
  onPrimaryContainer: "#123D38",
  secondaryContainer: "#DCE4EF",
  onSecondaryContainer: "#182B45",
  surfaceContainer: "#EFF3EF",
};

export const shape = {
  small: 8,
  medium: 16,
  large: 24,
  extraLarge: 32,
  full: 999,
  connected: 6,
};

export const typography = {
  display: {
    fontSize: 34,
    lineHeight: 41,
    fontWeight: "800" as const,
    letterSpacing: -1.2,
  },
  headline: {
    fontSize: 30,
    lineHeight: 37,
    fontWeight: "800" as const,
    letterSpacing: -0.8,
  },
  title: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "700" as const,
    letterSpacing: -0.4,
  },
  body: { fontSize: 17, lineHeight: 27 },
  label: { fontSize: 15, lineHeight: 22, fontWeight: "700" as const },
};

// Material 3 Expressive v0_14_0 spring values, adapted to RN's unit-mass model.
// damping = 2 * dampingRatio * sqrt(stiffness * mass).
// https://github.com/androidx/androidx/blob/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/ExpressiveMotionTokens.kt
export const motion = {
  fastSpatial: { stiffness: 800, damping: 2 * 0.6 * Math.sqrt(800), mass: 1 },
  spatial: { stiffness: 380, damping: 2 * 0.8 * Math.sqrt(380), mass: 1 },
  effects: { stiffness: 1600, damping: 2 * Math.sqrt(1600), mass: 1 },
};
