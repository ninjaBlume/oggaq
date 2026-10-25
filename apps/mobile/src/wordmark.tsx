import { Text } from "./text";
import * as Font from "expo-font";
import { Platform } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import brand from "../../../config/brand.json";
import { createBrandFontLoader } from "./fontLoading";

// Keep the complete font notice in exported/native bundles without changing Metro asset types.
void require("../assets/fonts/OFL.json");

const loader = createBrandFontLoader(Font, brand.wordmarkFontFamily,
  require("../assets/fonts/LeagueSpartan-Bold.ttf"), Platform.OS === "web");
export const loadBrandFont = loader.load;

export function BrandWordmark({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[style, {
    fontFamily: loader.isReady() ? brand.wordmarkFontFamily : undefined,
    fontWeight: "700", letterSpacing: 0.8,
  }]}>{brand.name}</Text>;
}
