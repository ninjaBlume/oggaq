import type { TextStyle } from "react-native";

export const textSizes = ["small", "standard", "large"] as const;
export type TextSize = (typeof textSizes)[number];
export const textSizeLabels: Record<TextSize, string> = { small: "Küçük", standard: "Standart", large: "Büyük" };
export const textSizeFactors: Record<TextSize, number> = { small: 0.9, standard: 1, large: 1.2 };
export function isTextSize(value: unknown): value is TextSize {
  return typeof value === "string" && textSizes.includes(value as TextSize);
}
export function scaledTextMetrics(style: Readonly<Partial<TextStyle>> | null | undefined, size: TextSize, nested = false): TextStyle {
  const factor = textSizeFactors[size];
  const fontSize = style?.fontSize ?? (nested ? undefined : 14);
  return {
    ...(fontSize === undefined ? {} : { fontSize: fontSize * factor }),
    ...(style?.lineHeight === undefined ? {} : { lineHeight: style.lineHeight * factor }),
  };
}

// Serialize rapid preference changes so an older native write cannot finish last.
export function preferenceWriter<T>(write: (value: T) => Promise<void>) {
  let previous = Promise.resolve();
  return (value: T) => {
    previous = previous.catch(() => {}).then(() => write(value));
    return previous;
  };
}
