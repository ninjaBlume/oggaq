import { useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./text";
import { useTheme } from "./themeContext";

export function ExamHeaderTitle({ children }: { children: string }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  // Reserve the back button's touch target and the same space on the other side.
  return <Text testID="exam-header-title" accessibilityRole="header" numberOfLines={2}
    style={{ maxWidth: Math.max(0, width - insets.left - insets.right - 124), color: palette.ink, fontSize: 14, lineHeight: 18, fontWeight: "700", textAlign: "center" }}>{children}</Text>;
}
