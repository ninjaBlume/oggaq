import type { ReactNode } from "react";
import { useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { palette } from "./theme";
export { palette } from "./theme";
export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: palette.paper },
  body: {
    width: "100%",
    maxWidth: 680,
    alignSelf: "center",
    padding: 24,
    gap: 20,
    paddingBottom: 32,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  card: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 24,
    padding: 20,
    gap: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: palette.ink,
    letterSpacing: -1,
    lineHeight: 37,
  },
  heading: {
    fontSize: 19,
    fontWeight: "700",
    color: palette.ink,
    letterSpacing: -0.4,
    lineHeight: 27,
  },
  text: { fontSize: 16, color: palette.ink, lineHeight: 25 },
  muted: { fontSize: 13, color: palette.muted, lineHeight: 20 },
  eyebrow: {
    fontSize: 11,
    fontWeight: "800",
    color: palette.muted,
    letterSpacing: 1.5,
  },
  button: {
    minHeight: 54,
    borderRadius: 16,
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: palette.primary,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "700",
    color: palette.white,
    lineHeight: 22,
  },
  secondary: { backgroundColor: palette.softBlue },
  secondaryText: { color: palette.primary },
  disabled: { opacity: 0.45 },
  input: {
    flex: 1,
    minHeight: 54,
    fontSize: 16,
    color: palette.ink,
    paddingVertical: 13,
    paddingHorizontal: 0,
  },
  error: {
    padding: 16,
    backgroundColor: palette.softRed,
    borderRadius: 16,
    gap: 10,
  },
  option: {
    borderWidth: 1.5,
    borderColor: palette.line,
    borderRadius: 18,
    padding: 16,
    minHeight: 64,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    backgroundColor: palette.white,
  },
  selected: { backgroundColor: palette.softBlue, borderColor: palette.primary },
  correct: { backgroundColor: palette.softMint, borderColor: palette.success },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    backgroundColor: palette.paper,
    gap: 12,
  },
  smallButton: {
    minWidth: 46,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    backgroundColor: palette.paper,
  },
  iconButton: {
    width: 46,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: palette.white,
  },
  link: { color: palette.primary, fontSize: 13, fontWeight: "700" },
});
export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
  icon: Icon,
  danger = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  icon?: LucideIcon;
  danger?: boolean;
}) {
  const color = danger
    ? palette.red
    : secondary
      ? palette.primary
      : palette.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        danger && { backgroundColor: palette.softRed },
        disabled && styles.disabled,
        pressed && !disabled && { opacity: 0.8, transform: [{ scale: 0.985 }] },
      ]}
    >
      {Icon && <Icon size={19} color={color} strokeWidth={2} />}
      <Text style={[styles.buttonText, { color }]}>{children}</Text>
    </Pressable>
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
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.6 }]}
    >
      <Icon size={23} color={palette.ink} strokeWidth={1.8} />
    </Pressable>
  );
}
export function TextLink({
  children,
  onPress,
}: {
  children: string;
  onPress: () => void;
}) {
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
  return <View style={styles.card}>{children}</View>;
}
export function Heading({ children }: { children: string }) {
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
  return (
    <View style={{ gap: 7 }}>
      {eyebrow && <Text style={styles.eyebrow}>{eyebrow}</Text>}
      <Heading>{title}</Heading>
      {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
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
  tone = "blue",
}: {
  children: string;
  tone?: "blue" | "green" | "red" | "neutral";
}) {
  const backgroundColor =
    tone === "green"
      ? palette.softMint
      : tone === "red"
        ? palette.softRed
        : tone === "neutral"
          ? palette.paper
          : palette.softBlue;
  const color =
    tone === "green"
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
  return (
    <View
      style={{
        alignItems: "center",
        gap: 12,
        paddingHorizontal: 22,
        paddingVertical: 32,
        borderRadius: 24,
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.line,
      }}
    >
      <View
        style={{
          width: 66,
          height: 66,
          borderRadius: 22,
          backgroundColor: palette.softBlue,
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
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  password?: boolean;
  numeric?: boolean;
  email?: boolean;
  editable?: boolean;
}) {
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
          style={styles.input}
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
          backgroundColor: "#17243E66",
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
            backgroundColor: palette.white,
            borderTopLeftRadius: 30,
            borderTopRightRadius: 30,
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
          <View style={{ paddingHorizontal: 24, paddingTop: 10 }}>
            <View style={styles.between}>
              <Text style={styles.heading}>{title}</Text>
              <IconButton icon={X} label="Kapat" onPress={close} />
            </View>
          </View>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 24, paddingTop: 12, gap: 12 }}
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
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 11,
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
          <Check size={17} color={palette.white} />
        ) : (
          <Text
            style={{
              fontSize: 13,
              fontWeight: "700",
              color: selected || incorrect ? palette.white : color,
            }}
          >
            {label}
          </Text>
        )}
      </View>
      <Text style={[styles.text, { flex: 1, fontSize: 15 }]}>
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
          padding: 17,
          backgroundColor: palette.white,
          borderWidth: 1,
          borderColor: palette.line,
        },
        pressed && { backgroundColor: palette.softBlue },
      ]}
    >
      <View
        style={{
          width: 44,
          height: 44,
          borderRadius: 14,
          backgroundColor: palette.softBlue,
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
        {subtitle && <Text style={styles.muted}>{subtitle}</Text>}
        {badge}
      </View>
      <ChevronRight size={18} color={palette.muted} />
    </Pressable>
  );
}
export function StudyHero({ compact = false }: { compact?: boolean }) {
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
          borderColor: "#FFFFFF26",
        }}
      />
      <View
        style={{
          position: "absolute",
          width: "76%",
          height: "76%",
          borderRadius: 100,
          borderWidth: 1,
          borderColor: "#FFFFFF33",
        }}
      />
      <View
        style={{
          backgroundColor: palette.mint,
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
          backgroundColor: palette.white,
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
