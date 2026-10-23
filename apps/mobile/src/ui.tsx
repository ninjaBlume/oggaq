import { Children } from "react";
import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  Mail,
  LockKeyhole,
  X,
} from "./icons";
import type { LucideIcon } from "lucide-react-native";
import { ApiError } from "@oggaq/api-client";
import { shape } from "./theme";
import { useLayout, useTheme } from "./themeContext";
import { ExpressivePressable } from "./expressive";
import { useSpringValue } from "./motion";
import { Animated } from "react-native";
export const percent = (value: number | null) =>
  value === null
    ? "—"
    : `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;
export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
  icon: Icon,
  danger = false,
  alignStart = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: LucideIcon;
  danger?: boolean;
  alignStart?: boolean;
}) {
  const { palette, styles } = useTheme();
  const color = danger
    ? palette.red
    : secondary
      ? palette.onPrimaryContainer
      : palette.onPrimary;
  return (
    <ExpressivePressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: palette.softRed },
        alignStart && { justifyContent: "flex-start" },
        disabled && styles.disabled,
      ]}
    >
      {Icon && <Icon size={19} color={color} strokeWidth={2} />}
      <Text style={[styles.buttonText, { color }]}>{children}</Text>
    </ExpressivePressable>
  );
}
export function IconButton({
  icon: Icon,
  label,
  onPress,
}: {
  icon: LucideIcon;
  label: string;
  onPress: () => void;
}) {
  const { palette, styles } = useTheme();
  return (
    <ExpressivePressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      radius={23}
      style={styles.iconButton}
    >
      <Icon size={23} color={palette.ink} strokeWidth={1.8} />
    </ExpressivePressable>
  );
}
export function TextLink({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) {
  const { styles } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      onPress={onPress}
      style={{ minHeight: 44, justifyContent: "center" }}
    >
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}
export function Card({ children }: { children: ReactNode }) {
  const { styles } = useTheme();
  const { cardPadding } = useLayout();
  return (
    <View style={[styles.card, { padding: cardPadding }]}>{children}</View>
  );
}
// Independent items (cards, exam rows) flow into two columns on an expanded window and stay one column elsewhere.
export function Columns({ children }: { children: ReactNode }) {
  const { columns } = useLayout();
  const items = Children.toArray(children);
  if (columns === 1) return <>{items}</>;
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
      {items.map((item, index) => (
        <View
          key={index}
          style={{ flexBasis: "47%", flexGrow: 1, maxWidth: "49.2%" }}
        >
          {item}
        </View>
      ))}
    </View>
  );
}
export function Heading({ children }: { children: string }) {
  const { styles } = useTheme();
  return (
    <Text accessibilityRole="header" style={styles.title}>
      {children}
    </Text>
  );
}
export function ScreenTitle({
  title,
  subtitle,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  eyebrow?: string;
}) {
  const { styles } = useTheme();
  return (
    <View style={{ gap: 7 }}>
      {!!eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Heading>{title}</Heading>
      {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
    </View>
  );
}
export function SectionTitle({
  children,
  action,
  onPress,
}: {
  children: string;
  action?: string;
  onPress?: () => void;
}) {
  const { styles } = useTheme();
  return (
    <View style={styles.between}>
      <Text accessibilityRole="header" style={styles.heading}>
        {children}
      </Text>
      {action && onPress && <TextLink onPress={onPress}>{action}</TextLink>}
    </View>
  );
}
export function Badge({
  children,
  tone = "primary",
}: {
  children: string;
  tone?: "primary" | "success" | "red" | "neutral";
}) {
  const { palette } = useTheme();
  const backgroundColor =
    tone === "success"
      ? palette.softSuccess
      : tone === "red"
        ? palette.softRed
        : tone === "neutral"
          ? palette.paper
          : palette.softPrimary;
  const color =
    tone === "success"
      ? palette.success
      : tone === "red"
        ? palette.red
        : tone === "neutral"
          ? palette.muted
          : palette.primary;
  return (
    <View
      style={{
        alignSelf: "flex-start",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 9,
        backgroundColor,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: "700", color }}>{children}</Text>
    </View>
  );
}
export function EmptyState({
  title,
  message,
  icon: Icon = BookOpen,
  action,
  onPress,
}: {
  title: string;
  message: string;
  icon?: LucideIcon;
  action?: string;
  onPress?: () => void;
}) {
  const { palette, styles } = useTheme();
  return (
    <View
      style={{
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 22,
        paddingVertical: 32,
        borderRadius: 20,
        backgroundColor: palette.surface,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 22,
          backgroundColor: palette.softPrimary,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 4,
        }}
      >
        <Icon size={29} strokeWidth={1.6} color={palette.primary} />
      </View>
      <Text style={[styles.heading, { textAlign: "center" }]}>{title}</Text>
      <Text style={[styles.muted, { textAlign: "center", maxWidth: 320 }]}>
        {message}
      </Text>
      {action && onPress && <TextLink onPress={onPress}>{action}</TextLink>}
    </View>
  );
}
export function Loading() {
  const { palette } = useTheme();
  return (
    <View style={{ padding: 32, alignItems: "center" }}>
      <ActivityIndicator
        accessibilityLabel="Yükleniyor"
        color={palette.primary}
        size="large"
      />
    </View>
  );
}
export function ErrorNotice({
  error,
  retry,
}: {
  error: unknown;
  retry?: () => void;
}) {
  const { palette, styles } = useTheme();
  if (!error) return null;
  let message =
    error instanceof ApiError
      ? error.message
      : "İşlem tamamlanamadı. Yeniden deneyin.";
  if (error instanceof ApiError && error.status === 422)
    message = Object.values(error.problem.errors ?? {}).flat()[0] ?? message;
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <View
        style={[styles.row, { flexWrap: "nowrap", alignItems: "flex-start" }]}
      >
        <CircleHelp size={20} color={palette.red} />
        <Text
          style={[styles.text, { flex: 1, fontSize: 14, color: palette.red }]}
        >
          {message}
        </Text>
      </View>
      {retry && <TextLink onPress={retry}>Yeniden dene</TextLink>}
    </View>
  );
}
export function Field({
  label,
  value,
  onChange,
  password = false,
  numeric = false,
  email = false,
  editable = true,
  multiline = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  password?: boolean;
  numeric?: boolean;
  email?: boolean;
  editable?: boolean;
  multiline?: boolean;
  maxLength?: number;
}) {
  const { palette, styles, scheme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [reveal, setReveal] = useState(false);
  const Icon = email ? Mail : password ? LockKeyhole : null;
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: "700", color: palette.ink }}>
        {label}
      </Text>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          paddingHorizontal: 15,
          backgroundColor: palette.paper,
          borderRadius: 16,
          borderWidth: 1.5,
          borderColor: focused ? palette.primary : "transparent",
        }}
      >
        {Icon && (
          <Icon size={18} color={focused ? palette.primary : palette.muted} />
        )}
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChange}
          secureTextEntry={password && !reveal}
          keyboardType={
            numeric ? "number-pad" : email ? "email-address" : "default"
          }
          autoCapitalize={email || password ? "none" : "sentences"}
          autoCorrect={!email && !password}
          editable={editable}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardAppearance={scheme}
          placeholderTextColor={palette.muted}
          selectionColor={palette.primary}
          multiline={multiline}
          maxLength={maxLength}
          style={
            multiline
              ? [
                  styles.input,
                  // A multiline input is a textarea on the web preview, which draws its own focus outline.
                  { minHeight: 96, textAlignVertical: "top", paddingTop: 14, outlineStyle: "none" } as object,
                ]
              : styles.input
          }
          textContentType={
            email ? "emailAddress" : password ? "password" : undefined
          }
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={reveal ? "Parolayı gizle" : "Parolayı göster"}
            onPress={() => setReveal(!reveal)}
            hitSlop={10}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            {reveal ? (
              <EyeOff size={19} color={palette.muted} />
            ) : (
              <Eye size={19} color={palette.muted} />
            )}
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function Sheet({
  visible,
  title,
  children,
  close,
}: {
  visible: boolean;
  title: string;
  children: ReactNode;
  close: () => void;
}) {
  const { palette, styles } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={close}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: palette.scrim,
          justifyContent: "flex-end",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Pencereyi kapat"
          onPress={close}
          style={{ flex: 1 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            width: "100%",
            maxWidth: 640,
            alignSelf: "center",
            backgroundColor: palette.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "80%",
            paddingBottom: Math.max(insets.bottom, 20),
          }}
        >
          <View
            style={{
              alignSelf: "center",
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: palette.line,
              marginTop: 12,
            }}
          />
          <View style={{ paddingHorizontal: 14, paddingTop: 10 }}>
            <View style={styles.between}>
              <Text style={styles.heading}>{title}</Text>
              <IconButton icon={X} label="Kapat" onPress={close} />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 14, paddingTop: 12, gap: 12 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
export function ConfirmDialog({
  visible,
  title,
  message,
  confirm,
  cancel,
  disabled = false,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirm: () => void;
  cancel: () => void;
  disabled?: boolean;
}) {
  const { styles } = useTheme();
  return (
    <Sheet
      visible={visible}
      title={title}
      close={() => {
        if (!disabled) cancel();
      }}
    >
      <Text style={styles.text}>{message}</Text>
      <Button disabled={disabled} onPress={confirm} icon={Check}>
        {title === "Denemeyi bitir"
          ? "Bitir ve değerlendir"
          : "Boş olarak kaydet"}
      </Button>
      <Button secondary disabled={disabled} onPress={cancel}>
        Devam et
      </Button>
    </Sheet>
  );
}
export function Option({
  label,
  text,
  selected,
  correct = false,
  incorrect = false,
  disabled,
  onPress,
}: {
  label: string;
  text: string;
  selected: boolean;
  correct?: boolean;
  incorrect?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const { palette, styles } = useTheme();
  const selection = useSpringValue(
    selected || correct || incorrect ? 1 : 0,
    "effects",
  );
  const color = correct
    ? palette.success
    : incorrect
      ? palette.red
      : selected
        ? palette.primary
        : palette.muted;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={text}
      accessibilityState={{ checked: selected, disabled }}
      aria-checked={selected}
      aria-disabled={disabled}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        selected && styles.selected,
        correct && styles.correct,
        incorrect && {
          borderColor: palette.red,
          backgroundColor: palette.softRed,
        },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Animated.View
        style={{
          width: 32,
          height: 32,
          borderRadius: selection.interpolate({
            inputRange: [0, 1],
            outputRange: [shape.small, 16],
          }),
          backgroundColor: correct
            ? palette.success
            : incorrect
              ? palette.red
              : selected
                ? palette.primary
                : palette.paper,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {correct ? (
          <Check size={17} color={palette.onSuccess} />
        ) : (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: incorrect ? palette.onRed : selected ? palette.onPrimary : color,
            }}
          >
            {label}
          </Text>
        )}
      </Animated.View>
      <Text style={[styles.text, { flex: 1 }]}>
        {text}
        {correct ? " · Doğru cevap" : ""}
      </Text>
    </Pressable>
  );
}
export function ListRow({
  title,
  subtitle,
  icon: Icon = BookOpen,
  onPress,
  badge,
  label,
}: {
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  onPress: () => void;
  badge?: ReactNode;
  label?: string;
}) {
  const { palette, styles } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flexDirection: "row",
          alignItems: "center",
          gap: 14,
          borderRadius: 20,
          padding: 14,
          backgroundColor: palette.surface,
          borderWidth: 1,
          borderColor: palette.line,
        },
        pressed && { backgroundColor: palette.softPrimary },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: palette.softPrimary,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={21} color={palette.primary} strokeWidth={1.8} />
      </View>
      <View style={{ flex: 1, gap: 5 }}>
        <Text
          numberOfLines={2}
          style={{
            fontSize: 14,
            lineHeight: 21,
            fontWeight: "600",
            color: palette.ink,
          }}
        >
          {title}
        </Text>
        {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
        {badge}
      </View>
      <ChevronRight size={18} color={palette.muted} />
    </Pressable>
  );
}
// How the answers split: a bar (correct, incorrect, blank) and a legend that spells it out, so meaning never rests on colour alone.
export function SplitBar({
  correct,
  incorrect,
  blank,
  height = 8,
  label,
}: {
  correct: number;
  incorrect: number;
  blank: number;
  height?: number;
  label?: string;
}) {
  const { palette } = useTheme();
  return (
    <View
      accessibilityRole={label ? "image" : undefined}
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        height,
        borderRadius: height / 2,
        overflow: "hidden",
        backgroundColor: palette.line,
      }}
    >
      <View style={{ flex: correct, backgroundColor: palette.primary }} />
      <View style={{ flex: incorrect, backgroundColor: palette.red }} />
      <View style={{ flex: blank }} />
    </View>
  );
}
export function SplitLegend({
  correct,
  incorrect,
  blank,
}: {
  correct: number;
  incorrect: number;
  blank: number;
}) {
  const { palette, styles } = useTheme();
  return (
    <View
      style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6 }}
    >
      {[
        [palette.primary, correct, "doğru"],
        [palette.red, incorrect, "yanlış"],
        [palette.muted, blank, "boş"],
      ].map(([color, count, label]) => (
        <View
          key={String(label)}
          style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
        >
          <View
            style={{
              width: 10,
              height: 10,
              borderRadius: 5,
              backgroundColor: String(color),
            }}
          />
          <Text style={styles.muted}>{`${count} ${label}`}</Text>
        </View>
      ))}
    </View>
  );
}
export function StudyHero({ compact = false }: { compact?: boolean }) {
  const { palette } = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: compact ? 100 : 156,
        height: compact ? 100 : 156,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          borderRadius: 100,
          borderWidth: 1,
          borderColor: palette.decorativeLine,
        }}
      />
      <View
        style={{
          position: "absolute",
          width: "76%",
          height: "76%",
          borderRadius: 100,
          borderWidth: 1,
          borderColor: palette.decorativeLine,
        }}
      />
      <View
        style={{
          backgroundColor: palette.accent,
          width: compact ? 62 : 88,
          height: compact ? 68 : 96,
          borderRadius: 23,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: "-12deg" }],
        }}
      >
        <BookOpen
          size={compact ? 30 : 44}
          strokeWidth={1.5}
          color={palette.navy}
        />
      </View>
      <View
        style={{
          position: "absolute",
          right: compact ? 2 : 8,
          bottom: compact ? 10 : 18,
          width: 35,
          height: 35,
          borderRadius: 12,
          backgroundColor: palette.surface,
          alignItems: "center",
          justifyContent: "center",
          transform: [{ rotate: "10deg" }],
        }}
      >
        <CheckCircle2 size={21} color={palette.primary} />
      </View>
    </View>
  );
}
export { ArrowRight };
