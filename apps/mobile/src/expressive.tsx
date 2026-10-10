import { useState, type ReactNode } from "react";
import {
  Animated,
  Pressable,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Svg, { Path } from "react-native-svg";
import { Check } from "./icons";
import { useReducedMotion, useSpringValue } from "./motion";
import { palette, shape } from "./theme";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ExpressivePressable({
  children,
  style,
  disabled,
  radius = 28,
  pressedRadius = shape.medium,
  ...props
}: Omit<PressableProps, "style" | "children"> & {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  radius?: number;
  pressedRadius?: number;
}) {
  const [pressed, setPressed] = useState(false);
  const reduced = useReducedMotion();
  const progress = useSpringValue(pressed && !disabled ? 1 : 0);
  return (
    <AnimatedPressable
      {...props}
      disabled={!!disabled}
      aria-disabled={!!disabled}
      onPressIn={(e) => {
        setPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        props.onPressOut?.(e);
      }}
      style={[
        style,
        {
          borderRadius: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [radius, pressedRadius],
            extrapolate: "clamp",
          }),
          transform: [
            {
              scale: reduced
                ? 1
                : progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 0.975],
                    extrapolate: "clamp",
                  }),
            },
          ],
        },
        pressed && !disabled && { opacity: 0.9 },
      ]}
    >
      {children}
    </AnimatedPressable>
  );
}

export function Enter({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const progress = useSpringValue(1, "spatial", 0);
  const reduced = useReducedMotion();
  return (
    <Animated.View
      testID="expressive-entry"
      style={[
        style,
        {
          opacity: progress.interpolate({
            inputRange: [0, 1],
            outputRange: [0, 1],
            extrapolate: "clamp",
          }),
          transform: [
            {
              translateY: reduced
                ? 0
                : progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
            },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

type Choice<T extends string> = {
  value: T;
  label: string;
  accessibilityLabel: string;
};
export function ChoiceGroup<T extends string>({
  choices,
  value,
  onChange,
  disabled = false,
}: {
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <View style={{ flexDirection: "row", gap: 4 }}>
      {choices.map((choice, index) => (
        <ChoiceButton
          key={choice.value}
          choice={choice}
          selected={choice.value === value}
          first={index === 0}
          last={index === choices.length - 1}
          disabled={disabled}
          onPress={() => onChange(choice.value)}
        />
      ))}
    </View>
  );
}
function ChoiceButton<T extends string>({
  choice,
  selected,
  first,
  last,
  disabled,
  onPress,
}: {
  choice: Choice<T>;
  selected: boolean;
  first: boolean;
  last: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const progress = useSpringValue(selected ? 1 : 0);
  const corner = (outer: boolean) =>
    progress.interpolate({
      inputRange: [0, 1],
      outputRange: [outer ? 26 : shape.connected, 26],
      extrapolate: "clamp",
    });
  return (
    <AnimatedPressable
      accessibilityRole="button"
      accessibilityLabel={choice.accessibilityLabel}
      accessibilityState={{ selected, disabled }}
      aria-selected={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 52,
        paddingHorizontal: 10,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        backgroundColor: selected ? palette.primary : palette.primaryContainer,
        borderTopLeftRadius: corner(first),
        borderBottomLeftRadius: corner(first),
        borderTopRightRadius: corner(last),
        borderBottomRightRadius: corner(last),
        opacity: disabled ? 0.45 : 1,
      }}
    >
      {selected && <Check size={16} color={palette.white} />}
      <Text
        style={{
          fontSize: 13,
          lineHeight: 20,
          fontWeight: "700",
          color: selected ? palette.white : palette.onPrimaryContainer,
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {choice.label}
      </Text>
    </AnimatedPressable>
  );
}

// A small code-native scalloped emblem; content stays separate and readable.
const flowerPath =
  Array.from({ length: 128 }, (_, i) => {
    const angle = (i / 128) * Math.PI * 2;
    const radius = 43 + 5 * Math.cos(angle * 8);
    return `${i === 0 ? "M" : "L"}${(50 + Math.cos(angle) * radius).toFixed(2)},${(50 + Math.sin(angle) * radius).toFixed(2)}`;
  }).join(" ") + " Z";
export function ExpressiveEmblem({
  children,
  size = 64,
  color = palette.primaryContainer,
}: {
  children: ReactNode;
  size?: number;
  color?: string;
}) {
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        accessible={false}
        aria-hidden
        importantForAccessibility="no-hide-descendants"
        style={{ position: "absolute", inset: 0 }}
      >
        <Svg width={size} height={size} viewBox="0 0 100 100">
          <Path d={flowerPath} fill={color} />
        </Svg>
      </View>
      <View style={{ zIndex: 1 }}>{children}</View>
    </View>
  );
}

export function TabIndicator({
  selected,
  children,
}: {
  selected: boolean;
  children: ReactNode;
}) {
  const progress = useSpringValue(selected ? 1 : 0);
  return (
    <Animated.View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: progress.interpolate({
          inputRange: [0, 1],
          outputRange: [shape.medium, 24],
          extrapolate: "clamp",
        }),
        backgroundColor: selected ? palette.primaryContainer : "transparent",
      }}
    >
      {children}
    </Animated.View>
  );
}
