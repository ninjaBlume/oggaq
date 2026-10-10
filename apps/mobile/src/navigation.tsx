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
  History,
  House,
  LogOut,
  Menu,
  ShieldCheck,
  UserRound,
  X,
} from "./icons";
import { motion, palette, shape } from "./theme";
import { useReducedMotion } from "./motion";

export const destinations = [
  { id: "home", label: "Ana sayfa", menuLabel: "Ana sayfa", icon: House },
  {
    id: "questions",
    label: "Soru çöz",
    menuLabel: "Soru bankası",
    icon: BookOpen,
  },
  { id: "exams", label: "Deneme", menuLabel: "Deneme sınavı", icon: Clock3 },
  {
    id: "history",
    label: "Geçmiş",
    menuLabel: "Çalışma geçmişi",
    icon: History,
  },
  { id: "profile", label: "Profil", menuLabel: "Profilim", icon: UserRound },
] as const;
export type MainTab = (typeof destinations)[number]["id"];

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
  return (
    <View style={navStyles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Menüyü aç"
        accessibilityHint="Gezinme ve çalışma alanı seçeneklerini gösterir"
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
        <Menu size={23} color={palette.navy} strokeWidth={1.8} />
      </Pressable>
      <View style={navStyles.brand}>
        <ShieldCheck size={23} color={palette.navy} strokeWidth={1.8} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={navStyles.wordmark}>{brand.displayName}</Text>
          <Text numberOfLines={1} style={navStyles.contextLabel}>
            {context.name}
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
  const insets = useSafeAreaInsets();
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
                <Text style={[navStyles.wordmark, { color: palette.white }]}>
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
                <X size={23} color={palette.white} strokeWidth={1.8} />
              </Pressable>
            </View>
            <Text style={navStyles.accountName}>{user.name}</Text>
            <Text style={navStyles.accountEmail}>{user.email}</Text>
          </View>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={navStyles.menuBody}
          >
            <Text style={navStyles.sectionLabel}>ÇALIŞMALARIM</Text>
            {destinations.map(({ id, menuLabel, icon: Icon }) => (
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
            ))}
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

const navStyles = StyleSheet.create({
  header: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
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
    color: palette.navy,
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
  contextLabel: { fontSize: 11, lineHeight: 16, color: palette.muted },
  panel: {
    height: "100%",
    backgroundColor: palette.white,
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
    color: palette.white,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 28,
  },
  accountEmail: { color: palette.onNavyMuted, fontSize: 13, lineHeight: 20 },
  menuBody: { padding: 16, gap: 6 },
  sectionLabel: {
    color: palette.muted,
    fontSize: 10,
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
    borderRadius: shape.full,
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
