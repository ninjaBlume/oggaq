import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform, useColorScheme, useWindowDimensions } from "react-native";
import * as SystemUI from "expo-system-ui";
import { StatusBar } from "expo-status-bar";
import { resolveScheme, themePreferences } from "@oggaq/design-tokens";
import type { ColorScheme, ThemePreference } from "@oggaq/design-tokens";
import { layoutFor } from "./layout";
import type { Layout } from "./layout";
import { stylesFor } from "./styles";
import type { Styles } from "./styles";
import { themeStore, textSizeStore } from "./storage";
import { isTextSize, preferenceWriter, type TextSize } from "./textSize";
import { TextSizeContext } from "./text";
import { palettes } from "./theme";
import type { AppPalette } from "./theme";

type Theme = {
  palette: AppPalette;
  styles: Styles;
  scheme: ColorScheme;
  preference: ThemePreference;
  setPreference: (next: ThemePreference) => void;
  textSize: TextSize;
  setTextSize: (next: TextSize) => void;
  textSizeError: unknown;
};
const ThemeContext = createContext<Theme | null>(null);

const isPreference = (value: unknown): value is ThemePreference =>
  themePreferences.includes(value as ThemePreference);

// Every component that paints with a colour reads it here, so a scheme change re-renders the open screens in place:
// no remount, no lost form, exam or navigation state.
export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>("light");
  const changed = useRef(false);
  const [textSize, setTextSizeState] = useState<TextSize>("standard");
  const [textSizeError, setTextSizeError] = useState<unknown>(null);
  const sizeRevision = useRef(0);
  const sizeMounted = useRef(true);
  const writeSize = useMemo(() => preferenceWriter(textSizeStore.write), []);
  useEffect(() => {
    sizeMounted.current = true;
    let mounted = true;
    void textSizeStore.read().then(saved => {
      if (mounted && sizeRevision.current === 0 && isTextSize(saved)) setTextSizeState(saved);
    }, error => {
      if (mounted && sizeRevision.current === 0) setTextSizeError(error);
    });
    return () => { mounted = false; sizeMounted.current = false; };
  }, []);
  const setTextSize = useCallback((next: TextSize) => {
    const revision = ++sizeRevision.current;
    setTextSizeState(next);
    setTextSizeError(null);
    void writeSize(next).catch(error => {
      if (sizeMounted.current && sizeRevision.current === revision) setTextSizeError(error);
    });
  }, [writeSize]);
  useEffect(() => {
    let mounted = true;
    themeStore.read().then(
      (saved) => {
        if (mounted && !changed.current && isPreference(saved))
          setPreferenceState(saved);
      },
      () => {
        /* Unreadable storage: keep the default light appearance. */
      },
    );
    return () => {
      mounted = false;
    };
  }, []);
  const setPreference = useCallback((next: ThemePreference) => {
    changed.current = true;
    setPreferenceState(next);
    themeStore.write(next).catch(() => {
      /* The choice stays applied for this session even if it cannot be saved. */
    });
  }, []);
  const scheme = resolveScheme(
    preference,
    system === "dark" ? "dark" : system === "light" ? "light" : null,
  );
  const palette = palettes[scheme];
  useEffect(() => {
    if (Platform.OS !== "web")
      void SystemUI.setBackgroundColorAsync(palette.paper).catch(() => {});
  }, [palette.paper]);
  const value = useMemo<Theme>(
    () => ({ palette, styles: stylesFor(scheme), scheme, preference, setPreference, textSize, setTextSize, textSizeError }),
    [palette, scheme, preference, setPreference, textSize, setTextSize, textSizeError],
  );
  return (
    <ThemeContext.Provider value={value}>
      <StatusBar style={scheme === "dark" ? "light" : "dark"} />
      <TextSizeContext.Provider value={textSize}>{children}</TextSizeContext.Provider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  const theme = useContext(ThemeContext);
  if (!theme) throw new Error("useTheme needs a ThemeProvider.");
  return theme;
}

// contentContainerStyle of a screen's scroll view: gutter by window class, centred, and as wide as the screen can use
// (`wide`: lists and grids) or only a reading column (forms, one question).
export function useBody(wide = false) {
  const layout = useLayout();
  return useMemo(
    () =>
      ({
        width: "100%",
        maxWidth: wide ? layout.maxWidth : layout.readingWidth,
        alignSelf: "center",
        padding: layout.gutter,
        gap: 20,
        paddingBottom: 32,
      }) as const,
    [layout, wide],
  );
}

export function useLayout(): Layout {
  const { width } = useWindowDimensions();
  return useMemo(() => layoutFor(width), [width]);
}
