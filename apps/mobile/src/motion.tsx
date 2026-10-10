import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AccessibilityInfo, Animated, Platform } from "react-native";
import { motion } from "./theme";

const ReducedMotion = createContext(true);
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let mounted = true;
    let changed = false;
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (enabled) => {
        changed = true;
        setReduced(enabled);
      },
    );
    void AccessibilityInfo.isReduceMotionEnabled().then(
      (enabled) => {
        if (mounted && !changed) setReduced(enabled);
      },
      () => {
        /* Keep motion off if the system preference cannot be read. */
      },
    );
    return () => {
      mounted = false;
      listener.remove();
    };
  }, []);
  return (
    <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>
  );
}
export function useReducedMotion() {
  return useContext(ReducedMotion);
}

export function useSpringValue(
  target: number,
  preset: keyof typeof motion = "fastSpatial",
  initial = target,
) {
  const reduced = useReducedMotion();
  const value = useRef(new Animated.Value(reduced ? target : initial)).current;
  useEffect(() => {
    value.stopAnimation();
    if (reduced) value.setValue(target);
    else
      Animated.spring(value, {
        toValue: target,
        ...motion[preset],
        useNativeDriver: Platform.OS !== "web",
        isInteraction: false,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
      }).start();
    return () => value.stopAnimation();
  }, [value, target, preset, reduced]);
  return value;
}
