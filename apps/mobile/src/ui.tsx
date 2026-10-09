import type { ReactNode } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ApiError } from "@oggaq/api-client";
export const palette = {
  ink: "#19372b",
  muted: "#66756c",
  green: "#286549",
  paper: "#f6f5f0",
  line: "#dde3dc",
  white: "#fff",
  red: "#9e3d35",
};
export const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: palette.paper },
  body: {
    width: "100%",
    maxWidth: 840,
    alignSelf: "center",
    padding: 20,
    gap: 16,
    paddingBottom: 40,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 10,
  },
  card: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 18,
    padding: 20,
    gap: 14,
  },
  title: { fontSize: 29, fontWeight: "700", color: palette.ink },
  heading: { fontSize: 21, fontWeight: "600", color: palette.ink },
  text: { fontSize: 16, color: palette.ink, lineHeight: 24 },
  muted: { fontSize: 14, color: palette.muted, lineHeight: 21 },
  button: {
    minHeight: 48,
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 18,
    backgroundColor: palette.green,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: palette.white },
  secondary: { backgroundColor: "#e6eee7" },
  secondaryText: { color: palette.ink },
  disabled: { opacity: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: "#c9d3ca",
    borderRadius: 10,
    minHeight: 48,
    fontSize: 16,
    padding: 12,
    color: palette.ink,
    backgroundColor: palette.white,
  },
  error: { padding: 16, backgroundColor: "#fff0ed", borderRadius: 12, gap: 10 },
  option: {
    borderWidth: 1,
    borderColor: palette.line,
    borderRadius: 12,
    padding: 16,
    minHeight: 52,
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
  },
  selected: { backgroundColor: "#e8f0e9", borderColor: palette.green },
  correct: { backgroundColor: "#dceee0", borderColor: palette.green },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderColor: palette.line,
    gap: 12,
  },
  smallButton: {
    minWidth: 46,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#e6eee7",
  },
});
export function Button({
  children,
  onPress,
  disabled = false,
  secondary = false,
}: {
  children: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={children}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.button,
        secondary && styles.secondary,
        disabled && styles.disabled,
      ]}
    >
      <Text style={[styles.buttonText, secondary && styles.secondaryText]}>
        {children}
      </Text>
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
export function Loading() {
  return (
    <ActivityIndicator
      accessibilityLabel="Yükleniyor"
      color={palette.green}
      size="large"
    />
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
  let message = error instanceof Error ? error.message : "İşlem tamamlanamadı.";
  if (error instanceof ApiError && error.status === 422)
    message = Object.values(error.problem.errors ?? {}).flat()[0] ?? message;
  return (
    <View accessibilityRole="alert" style={styles.error}>
      <Text style={styles.text}>{message}</Text>
      {retry && (
        <Button secondary onPress={retry}>
          Yeniden dene
        </Button>
      )}
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
  return (
    <View style={{ gap: 6 }}>
      <Text style={styles.text}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={onChange}
        secureTextEntry={password}
        keyboardType={
          numeric ? "number-pad" : email ? "email-address" : "default"
        }
        autoCapitalize={email || password ? "none" : "sentences"}
        autoCorrect={!email && !password}
        editable={editable}
        style={styles.input}
      />
    </View>
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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={cancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "#19372b99",
          justifyContent: "center",
          padding: 24,
        }}
      >
        <View
          style={[
            styles.card,
            { maxWidth: 480, width: "100%", alignSelf: "center" },
          ]}
        >
          <Text accessibilityRole="header" style={styles.heading}>
            {title}
          </Text>
          <Text style={styles.text}>{message}</Text>
          <Button disabled={disabled} onPress={confirm}>
            {title === "Denemeyi bitir"
              ? "Bitir ve değerlendir"
              : "Boş olarak kaydet"}
          </Button>
          <Button secondary disabled={disabled} onPress={cancel}>
            Devam et
          </Button>
        </View>
      </View>
    </Modal>
  );
}
