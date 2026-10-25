import { createContext, useContext, useMemo, type ComponentPropsWithRef } from "react";
import { StyleSheet, Text as NativeText, TextInput as NativeTextInput } from "react-native";
import { scaledTextMetrics, type TextSize } from "./textSize";

export const TextSizeContext = createContext<TextSize>("standard");
const InText = createContext(false);

// Apply the app preference once, on top of the original text metrics. Native
// Dynamic Type/font scaling remains enabled. No global defaults are mutated.
export function Text({ style, children, ...props }: ComponentPropsWithRef<typeof NativeText>) {
  const size = useContext(TextSizeContext);
  const nested = useContext(InText);
  const metrics = useMemo(() => scaledTextMetrics(StyleSheet.flatten(style), size, nested), [style, size, nested]);
  return <NativeText {...props} style={[style, metrics]}>
    <InText.Provider value>{children}</InText.Provider>
  </NativeText>;
}
export function TextInput({ style, ...props }: ComponentPropsWithRef<typeof NativeTextInput>) {
  const size = useContext(TextSizeContext);
  const metrics = useMemo(() => scaledTextMetrics(StyleSheet.flatten(style), size), [style, size]);
  return <NativeTextInput {...props} style={[style, metrics]} />;
}
