import { StyleSheet } from "react-native";
import type { ColorScheme } from "@oggaq/design-tokens";
import { palettes, shape, typography } from "./theme";
import type { AppPalette } from "./theme";

// Shared styles for one palette. They are rebuilt only when the colour scheme changes (see stylesFor).
export function makeStyles(palette: AppPalette) {
  return StyleSheet.create({
    shell: { flex: 1, backgroundColor: palette.paper },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      alignItems: "center",
      gap: 10,
    },
    between: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12,
    },
    card: {
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.line,
      borderRadius: shape.large,
      padding: 14,
      gap: 12,
    },
    title: {
      ...typography.headline,
      color: palette.ink,
    },
    heading: {
      ...typography.title,
      color: palette.ink,
    },
    text: { ...typography.body, color: palette.ink },
    muted: { fontSize: 13, color: palette.muted, lineHeight: 20 },
    eyebrow: {
      fontSize: 11,
      fontWeight: "800",
      color: palette.muted,
      letterSpacing: 1.5,
    },
    button: {
      minHeight: 54,
      borderRadius: 28,
      paddingVertical: 15,
      paddingHorizontal: 20,
      backgroundColor: palette.primary,
      flexDirection: "row",
      gap: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    buttonText: {
      fontSize: 15,
      fontWeight: "700",
      color: palette.onPrimary,
      lineHeight: 22,
    },
    secondary: { backgroundColor: palette.primaryContainer },
    secondaryText: { color: palette.onPrimaryContainer },
    disabled: { opacity: 0.45 },
    input: {
      flex: 1,
      minHeight: 54,
      fontSize: 16,
      color: palette.ink,
      paddingVertical: 13,
      paddingHorizontal: 0,
    },
    error: {
      padding: 14,
      backgroundColor: palette.softRed,
      borderRadius: 16,
      gap: 10,
    },
    option: {
      borderWidth: 1.5,
      borderColor: palette.line,
      borderRadius: shape.large,
      padding: 14,
      minHeight: 64,
      flexDirection: "row",
      gap: 14,
      alignItems: "center",
      backgroundColor: palette.surface,
    },
    selected: {
      backgroundColor: palette.softPrimary,
      borderColor: palette.primary,
    },
    correct: {
      backgroundColor: palette.softSuccess,
      borderColor: palette.success,
    },
    header: {
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: palette.paper,
      gap: 12,
    },
    smallButton: {
      minWidth: 46,
      minHeight: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 14,
      backgroundColor: palette.surfaceContainer,
    },
    iconButton: {
      width: 46,
      height: 46,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: 16,
      backgroundColor: palette.surface,
    },
    link: { color: palette.primary, fontSize: 13, fontWeight: "700" },
  });
}
export type Styles = ReturnType<typeof makeStyles>;

const cache: Partial<Record<ColorScheme, Styles>> = {};
export function stylesFor(scheme: ColorScheme): Styles {
  return (cache[scheme] ??= makeStyles(palettes[scheme]));
}
