import { useLayoutEffect, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { BrandLogo } from "./brandLogo";
import { useReducedMotion } from "./motion";
import { useTheme } from "./themeContext";

// A short visual handover only: requests start immediately and keep their own
// loading/error states. Question changes and background refreshes do not wait.
const TRANSITION_MS = 400;

export function PageTransition({ page, children }: { page: string; children: ReactNode }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const { palette } = useTheme();
  const [visible, setVisible] = useState(true);
  const pulse = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    setVisible(focused);
    if (!focused) return;
    const timer = setTimeout(() => setVisible(false), TRANSITION_MS);
    return () => clearTimeout(timer);
  }, [page, focused]);

  useEffect(() => {
    pulse.setValue(0);
    if (!visible || reduced) return;
    const step = (toValue: number) => Animated.timing(pulse, {
      toValue,
      duration: 190,
      useNativeDriver: Platform.OS !== "web",
      isInteraction: false,
    });
    const animation = Animated.loop(Animated.sequence([step(1), step(0)]));
    animation.start();
    return () => {
      animation.stop();
      pulse.stopAnimation();
    };
  }, [visible, reduced, pulse]);

  return (
    <View style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        pointerEvents={visible ? "none" : "auto"}
        accessibilityElementsHidden={visible}
        importantForAccessibility={visible ? "no-hide-descendants" : "auto"}
        aria-hidden={visible}
      >
        {children}
      </View>
      {visible && (
        <View
          testID="page-transition"
          accessibilityRole="progressbar"
          accessibilityLabel="Sayfa yükleniyor"
          accessibilityLiveRegion="polite"
          accessibilityViewIsModal
          style={[StyleSheet.absoluteFill, {
            zIndex: 10,
            backgroundColor: palette.paper,
            alignItems: "center",
            justifyContent: "center",
          }]}
        >
          <Animated.View style={{
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1] }) }],
          }}>
            <BrandLogo size={104} />
          </Animated.View>
        </View>
      )}
    </View>
  );
}
