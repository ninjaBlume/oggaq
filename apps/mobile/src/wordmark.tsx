import * as Font from "expo-font";
import { Platform, Text } from "react-native";
import type { StyleProp, TextStyle } from "react-native";
import brand from "../../../config/brand.json";

// Keep the complete font notice in exported/native bundles without changing Metro asset types.
void require("../assets/fonts/OFL.json");

let ready = false;

export async function loadBrandFont(): Promise<void> {
  if (ready) return;
  // Expo web registers CSS before the download finishes. A failed face must be
  // removed before retrying, otherwise isLoaded() can mistake that CSS for success.
  if (Platform.OS === "web" && Font.isLoaded(brand.wordmarkFontFamily)) {
    await Font.unloadAsync(brand.wordmarkFontFamily);
  }
  await Font.loadAsync([{
    fontFamily: brand.wordmarkFontFamily,
    fontDefinitions: [{ path: require("../assets/fonts/LeagueSpartan-Bold.ttf"), weight: 700 }],
  }]);
  ready = true;
}

export function BrandWordmark({ style }: { style?: StyleProp<TextStyle> }) {
  return <Text style={[style, {
    fontFamily: ready ? brand.wordmarkFontFamily : undefined,
    fontWeight: "700", letterSpacing: 0.8,
  }]}>{brand.name}</Text>;
}
