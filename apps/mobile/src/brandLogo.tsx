import { Image } from "react-native";

// Derived from the single approved source in config/assets; adjacent text names the brand.
export function BrandLogo({ size = 46 }: { size?: number }) {
  return <Image source={require("../assets/brand-logo.png")} resizeMode="contain"
    style={{ width: size, height: size }} accessible={false} importantForAccessibility="no"
    accessibilityIgnoresInvertColors />;
}
