import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Keyboard,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import type { StudyContext, User } from "@oggaq/shared-types";
import brand from "../brand.json";
import {
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  Clock3,
  ChartColumn,
  History,
  House,
  ListChecks,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "./icons";
import { vocabulary } from "@oggaq/study-core";
import { motion, shape } from "./theme";
import type { AppPalette } from "./theme";
import { railWidth } from "./layout";
import { TabIndicator } from "./expressive";
import { useReducedMotion } from "./motion";
import { useLayout, useTheme } from "./themeContext";

// Names come from the shared vocabulary (study-core): `short` on tabs and the rail, `title` in the menu.
export const destinations = [
  { id: "home", label: vocabulary.home.short, menuLabel: vocabulary.home.title, icon: House },
  { id: "deneme", label: vocabulary.deneme.short, menuLabel: vocabulary.deneme.title, icon: Clock3 },
  { id: "ders", label: vocabulary.ders.short, menuLabel: vocabulary.ders.title, icon: BookOpen },
  { id: "history", label: vocabulary.results.short, menuLabel: vocabulary.results.title, icon: History },
  { id: "profile", label: vocabulary.profile.short, menuLabel: vocabulary.profile.title, icon: UserRound },
] as const;
// Reachable from the side menu and home only; the tab bar / rail keeps its five primary tabs.
export const extraDestinations = [
  { id: "review", label: vocabulary.review.short, menuLabel: vocabulary.review.title, icon: ListChecks },
  { id: "stats", label: vocabulary.stats.short, menuLabel: vocabulary.stats.title, icon: ChartColumn },
] as const;
export type MainTab =
  | (typeof destinations)[number]["id"]
  | (typeof extraDestinations)[number]["id"];

export function MainHeader({
  user,
  context,
  menu,
  profile,
  expanded,
}: {
  user: User;
  context: StudyContext;
  menu: () => void;
  profile: () => void;
  expanded: boolean;
}) {
  const { palette } = useTheme();
  const navStyles = useNavStyles();
  const layout = useLayout();
  return (
    <View
      style={[
        navStyles.header,
        { maxWidth: layout.maxWidth, paddingHorizontal: layout.gutter },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menüyü aç"
        accessibilityHint="Tekrar ve başarı seçeneklerini gösterir"
        accessibilityState={{ expanded }}
        aria-expanded={expanded}
        onPress={() => {
          Keyboard.dismiss();
          menu();
        }}
        style={({ pressed }) => [
          navStyles.headerButton,
          pressed && navStyles.pressed,
        ]}
      >
        <Menu size={23} color={palette.ink} strokeWidth={1.8} />
      </Pressable>
      <View style={navStyles.brand}>
        <ShieldCheck size={23} color={palette.primary} strokeWidth={1.8} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={navStyles.wordmark}>{brand.displayName}</Text>
          <Text numberOfLines={1} style={navStyles.contextLabel}>
            {context.kind === "personal" ? brand.subtitle : context.name}
          </Text>
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Profilimi aç"
        onPress={profile}
        style={({ pressed }) => [
          navStyles.avatarButton,
          pressed && navStyles.pressed,
        ]}
      >
        <Text style={navStyles.avatarLetter}>
          {user.name.trim().slice(0, 1).toLocaleUpperCase("tr-TR")}
        </Text>
      </Pressable>
    </View>
  );
}

// Mount only while open. Modal owns native back/Escape and web focus containment.
export function SideMenu({
  user,
  context,
  contexts,
  selected,
  select,
  choose,
  logout,
  pending,
  close,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  selected: MainTab;
  select: (tab: MainTab) => void;
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
  close: () => void;
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const navStyles = useNavStyles();
  const { width } = useWindowDimensions();
  const panelWidth = Math.min(340, width - 48);
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);
  const reducedMotion = useReducedMotion();
  useEffect(() => () => progress.stopAnimation(), [progress]);
  const animate = useCallback(
    (value: number, done?: () => void) => {
      progress.stopAnimation();
      if (reducedMotion) {
        progress.setValue(value);
        done?.();
        return;
      }
      Animated.spring(progress, {
        toValue: value,
        ...motion.spatial,
        overshootClamping: value === 0,
        restDisplacementThreshold: 0.001,
        restSpeedThreshold: 0.001,
        isInteraction: false,
        useNativeDriver: Platform.OS !== "web",
      }).start(({ finished }) => {
        if (finished) done?.();
      });
    },
    [progress, reducedMotion],
  );
  const dismiss = useCallback(
    (after?: () => void) => {
      if (closing.current) return;
      closing.current = true;
      animate(0, () => {
        close();
        after?.();
      });
    },
    [animate, close],
  );
  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, g) =>
          !closing.current &&
          g.dx < -12 &&
          Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderGrant: () => progress.stopAnimation(),
        onPanResponderMove: (_, g) =>
          progress.setValue(Math.max(0, Math.min(1, 1 + g.dx / panelWidth))),
        onPanResponderRelease: (_, g) => {
          if (g.dx < -panelWidth * 0.22 || g.vx < -0.45) dismiss();
          else animate(1);
        },
        onPanResponderTerminate: () => animate(1),
      }),
    [animate, dismiss, panelWidth, progress],
  );
  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      supportedOrientations={["portrait", "landscape"]}
      onShow={() => animate(1)}
      onRequestClose={() => dismiss()}
    >
      <View style={{ flex: 1 }}>
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: palette.scrim,
              opacity: progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 1],
                extrapolate: "clamp",
              }),
            },
          ]}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Menü dışına dokunarak kapat"
          onPress={() => dismiss()}
          style={StyleSheet.absoluteFill}
        />
        <Animated.View
          {...pan.panHandlers}
          accessibilityLabel="Uygulama menüsü"
          accessibilityViewIsModal
          onAccessibilityEscape={() => dismiss()}
          style={[
            navStyles.panel,
            {
              width: panelWidth,
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-panelWidth, 0],
                    extrapolate: "clamp",
                  }),
                },
              ],
            },
          ]}
        >
          <StatusBar style="light" />
          <View style={[navStyles.account, { paddingTop: insets.top + 16 }]}>
            <View style={navStyles.between}>
              <View style={navStyles.brand}>
                <ShieldCheck size={24} color={palette.accent} />
                <Text style={[navStyles.wordmark, { color: palette.onNavy }]}>
                  {brand.displayName}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Menüyü kapat"
                onPress={() => dismiss()}
                style={({ pressed }) => [
                  navStyles.headerButton,
                  pressed && navStyles.pressed,
                ]}
              >
                <X size={23} color={palette.onNavy} strokeWidth={1.8} />
              </Pressable>
            </View>
            <Text style={navStyles.accountName}>{user.name}</Text>
            <Text style={navStyles.accountEmail}>{user.email}</Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={navStyles.menuBody}
          >
            <Text style={navStyles.sectionLabel}>ÇALIŞMA ARAÇLARI</Text>
            {extraDestinations.map(
              ({ id, menuLabel, icon: Icon }) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={menuLabel}
                accessibilityState={{ selected: selected === id }}
                aria-selected={selected === id}
                onPress={() => dismiss(() => select(id))}
                style={({ pressed }) => [
                  navStyles.menuRow,
                  selected === id && navStyles.selectedRow,
                  pressed && navStyles.pressed,
                ]}
              >
                <Icon
                  size={21}
                  color={selected === id ? palette.primary : palette.muted}
                  strokeWidth={1.8}
                />
                <Text
                  style={[
                    navStyles.menuText,
                    selected === id && { color: palette.primary },
                  ]}
                >
                  {menuLabel}
                </Text>
                {selected === id ? (
                  <View style={navStyles.selectionDot} />
                ) : (
                  <ChevronRight size={16} color={palette.muted} />
                )}
              </Pressable>
              ),
            )}
            {contexts.length > 1 && (
              <>
                <View style={navStyles.separator} />
                <Text style={navStyles.sectionLabel}>ÇALIŞMA ALANIM</Text>
                {contexts.map((c) => {
                  const Icon = c.kind === "personal" ? UserRound : Building2;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityLabel={`${c.name} çalışma alanını seç`}
                      accessibilityState={{ selected: c.id === context.id }}
                      aria-selected={c.id === context.id}
                      onPress={() =>
                        dismiss(() => {
                          if (c.id !== context.id) choose(c.id);
                        })
                      }
                      style={({ pressed }) => [
                        navStyles.menuRow,
                        pressed && navStyles.pressed,
                      ]}
                    >
                      <Icon size={21} color={palette.muted} />
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={navStyles.contextName}>{c.name}</Text>
                        <Text style={navStyles.contextLabel}>
                          {c.kind === "personal"
                            ? "Kişisel çalışma"
                            : "Kurum çalışma alanı"}
                        </Text>
                      </View>
                      {c.id === context.id && (
                        <Check size={19} color={palette.primary} />
                      )}
                    </Pressable>
                  );
                })}
              </>
            )}
          </ScrollView>
          <View
            style={[
              navStyles.footer,
              { paddingBottom: Math.max(insets.bottom, 16) },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Çıkış yap"
              accessibilityState={{ disabled: pending }}
              disabled={pending}
              onPress={() => dismiss(logout)}
              style={({ pressed }) => [
                navStyles.menuRow,
                pressed && navStyles.pressed,
                pending && { opacity: 0.45 },
              ]}
            >
              <LogOut size={21} color={palette.red} />
              <Text style={[navStyles.menuText, { color: palette.red }]}>
                {pending ? "Oturum kapatılıyor…" : "Çıkış yap"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

// The five primary tabs. Compact windows show them as a bottom bar, wider ones as a rail on the left (docs/DESIGN.md
// section 5); roles and names are the same, so assistive technology and tests see one navigation.
export function PrimaryNavigation({
  tab,
  select,
  placement,
}: {
  tab: MainTab;
  select: (id: MainTab) => void;
  placement: "bottom" | "rail";
}) {
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const items = destinations.map(({ id, label, icon: Icon }) => (
    <Pressable
      key={id}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: tab === id }}
      aria-selected={tab === id}
      onPress={() => select(id)}
      style={
        placement === "bottom"
          ? { flex: 1, minHeight: 52, alignItems: "center", justifyContent: "center", gap: 5 }
          : { width: railWidth - 8, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 4 }
      }
    >
      <TabIndicator selected={tab === id}>
        <Icon
          size={22}
          strokeWidth={tab === id ? 2.3 : 1.7}
          color={tab === id ? palette.primary : palette.muted}
        />
      </TabIndicator>
      <Text
        style={{
          fontSize: 11,
          fontWeight: tab === id ? "700" : "500",
          color: tab === id ? palette.primary : palette.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  ));
  if (placement === "bottom")
    return (
      <View
        accessibilityLabel="Ana gezinme"
        style={{
          flexDirection: "row",
          paddingTop: 10,
          paddingBottom: Math.max(insets.bottom, 12),
          paddingHorizontal: 8,
          backgroundColor: palette.surface,
          borderTopWidth: 1,
          borderColor: palette.line,
        }}
      >
        {items}
      </View>
    );
  return (
    <ScrollView
      accessibilityLabel="Ana gezinme"
      showsVerticalScrollIndicator={false}
      style={{
        width: railWidth,
        flexGrow: 0,
        backgroundColor: palette.surface,
        borderRightWidth: 1,
        borderColor: palette.line,
      }}
      contentContainerStyle={{
        alignItems: "center",
        gap: 6,
        paddingTop: 12,
        paddingBottom: Math.max(insets.bottom, 12),
      }}
    >
      {items}
    </ScrollView>
  );
}

function makeNavStyles(palette: AppPalette) {
  return StyleSheet.create({
  header: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  brand: { flex: 1, flexDirection: "row", gap: 10, alignItems: "center" },
  wordmark: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: palette.ink,
  },
  avatarButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: palette.softPrimary,
  },
  avatarLetter: { fontSize: 16, fontWeight: "700", color: palette.primary },
  contextLabel: { fontSize: 12, lineHeight: 18, color: palette.muted },
  panel: {
    height: "100%",
    backgroundColor: palette.surface,
    borderTopRightRadius: shape.extraLarge,
    borderBottomRightRadius: shape.extraLarge,
    overflow: "hidden",
  },
  account: {
    backgroundColor: palette.navy,
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 8,
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  accountName: {
    marginTop: 12,
    color: palette.onNavy,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  accountEmail: { color: palette.onNavyMuted, fontSize: 13, lineHeight: 20 },
  menuBody: { padding: 16, gap: 6 },
  sectionLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  menuRow: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: shape.medium,
  },
  menuText: {
    flex: 1,
    color: palette.ink,
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 21,
  },
  selectedRow: { backgroundColor: palette.softPrimary },
  selectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: palette.primary,
  },
  contextName: {
    color: palette.ink,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 20,
  },
  separator: {
    height: 1,
    backgroundColor: palette.line,
    marginHorizontal: 12,
    marginVertical: 12,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: palette.line,
  },
  pressed: { opacity: 0.65 },
});
}
function useNavStyles() {
  const { palette } = useTheme();
  return useMemo(() => makeNavStyles(palette), [palette]);
}
