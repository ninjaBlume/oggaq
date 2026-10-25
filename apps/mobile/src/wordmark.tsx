import { Text } from "./text";
import * as Font from "expo-font";
import { Platform, StyleSheet } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import brand from "../../../config/brand.json";
import { createBrandFontLoader } from "./fontLoading";

// Keep the complete font notice in exported/native bundles without changing Metro asset types.
void require("../assets/fonts/OFL.json");

const loader = createBrandFontLoader(Font, brand.wordmarkFontFamily,
  require("../assets/fonts/LeagueSpartan-Bold.ttf"), Platform.OS === "web");
export const loadBrandFont = loader.load;

export function BrandWordmark({ style }: { style?: StyleProp<TextStyle> }) {
  const metrics = StyleSheet.flatten(style);
  const fontSize = metrics?.fontSize ?? 14;
  const padding = metrics?.paddingTop ?? metrics?.paddingVertical ?? metrics?.padding;
  return <Text style={[style, {
    fontFamily: loader.isReady() ? brand.wordmarkFontFamily : undefined,
    fontWeight: "700", letterSpacing: 0.8,
    // Ö reaches above this font's typographic ascender. Reserve real space for
    // the dots instead of letting the native text frame clip them to an O.
    lineHeight: Math.max(metrics?.lineHeight ?? 0, Math.ceil(fontSize * 1.5)),
    paddingTop: Math.max(typeof padding === "number" ? padding : 0, Math.ceil(fontSize * 0.18)),
    includeFontPadding: true,
  }]}>{brand.name}</Text>;
}
