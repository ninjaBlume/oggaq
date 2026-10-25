import { useCallback, useLayoutEffect, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { BrandLogo } from "./brandLogo";
import { useReducedMotion } from "./motion";
import { useTheme } from "./themeContext";
import { PageLoading } from "./pageLoading";

// Fast pages are never covered. Show branding only for real foreground loads.
const LOADING_THRESHOLD_MS = 120;

export function PageTransition({ page, children }: { page: string; children: ReactNode }) {
  const focused = useIsFocused();
  const reduced = useReducedMotion();
  const { palette } = useTheme();
  const [visible, setVisible] = useState(false);
  const [pending, setPending] = useState(0);
  const mounted = useRef(false);
  const pulse = useRef(new Animated.Value(0)).current;
  useLayoutEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const beginLoading = useCallback(() => {
    let released = false;
    setPending(count => count + 1);
    return () => {
      if (released) return;
      released = true;
      if (mounted.current) setPending(count => Math.max(0, count - 1));
    };
  }, []);

  useLayoutEffect(() => {
    setVisible(false);
    if (!focused || pending === 0) return;
    const timer = setTimeout(() => setVisible(true), LOADING_THRESHOLD_MS);
    return () => clearTimeout(timer);
  }, [page, focused, pending > 0]);

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
    <PageLoading.Provider value={beginLoading}>
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
    </PageLoading.Provider>
  );
}
