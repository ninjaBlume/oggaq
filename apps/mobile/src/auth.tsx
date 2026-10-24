import { useState } from "react";
import { Linking, Platform, Text, View } from "react-native";
import { ShieldCheck, CheckCircle2, GraduationCap } from "./icons";
import brand from "../brand.json";
import { shape, typography } from "./theme";
import type { User } from "@oggaq/shared-types";
import { api, frontendUrl } from "./api";
import { deviceId, session } from "./storage";
import { useTask } from "./hooks";
import {
  Button,
  Card,
  ErrorNotice,
  Field,
  Heading,
  TextLink,
} from "./ui";
import { useTheme } from "./themeContext";

const devicePlatform = Platform.OS === "ios" || Platform.OS === "android" ? Platform.OS : "web";
export function Login({ signedIn }: { signedIn: (user: User) => void }) {
  const { palette, styles } = useTheme();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [notice, setNotice] = useState("");
  const task = useTask<User | null>();
  function submit() {
    void task.run(
      async () => {
        if (mode === "register") {
          await api.request("post", "/api/v1/auth/register", {
            body: {
              name,
              email,
              password,
              password_confirmation: confirmation,
            },
          });
          setMode("login");
          setPassword("");
          setConfirmation("");
          setNotice("Hesabın oluşturuldu. Giriş yapıp e-postanı doğrula.");
          return null;
        }
        if (mode === "forgot") {
          await api.request("post", "/api/v1/auth/forgot-password", {
            body: { email },
          });
          setNotice(
            "Hesap mevcutsa parola yenileme bağlantısı gönderildi. E-postandaki bağlantıyı aç.",
          );
          return null;
        }
        const response = await api.request(
          "post",
          "/api/v1/auth/mobile-tokens",
          { body: { email, password, device_id: await deviceId(), device_platform: devicePlatform } },
        );
        try {
          await session.save({
            token: response.data.token,
            expiresAt: response.data.expires_at,
          });
        } catch (error) {
          // Do not orphan a newly issued token if native secure storage is locked.
          const { ApiClient } = await import("@oggaq/api-client");
          const revoke = new ApiClient((await import("./api")).apiUrl, {
            auth: "bearer",
            accessToken: () => response.data.token,
          });
          await revoke
            .request("post", "/api/v1/auth/logout", {})
            .catch(() => {});
          throw error;
        }
        setPassword("");
        return response.data.user;
      },
      (user) => {
        if (user) signedIn(user);
      },
    );
  }
  function change(next: typeof mode) {
    setMode(next);
    setNotice("");
    setPassword("");
    setConfirmation("");
    task.reset();
  }
  const heading = mode === "login" ? "Hoş geldin" : mode === "register" ? "Hesap oluştur" : "Parolanı yenile";
  const description = mode === "login"
    ? "Denemelerine ve sonuçlarına ulaş."
    : mode === "register"
      ? "Ücretsiz hesabınla sınavlarını ve sonuçlarını takip et."
      : "E-posta adresine parola yenileme bağlantısı gönderelim.";
  return (
    <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 20, paddingTop: 12 }}>
      <View style={{ backgroundColor: palette.navy, borderRadius: shape.large, padding: 22, gap: 18, overflow: "hidden" }}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", right: -36, top: -42, width: 156, height: 156, borderRadius: shape.extraLarge, borderWidth: 1, borderColor: palette.decorativeLine, transform: [{ rotate: "25deg" }] }}>
          <View style={{ position: "absolute", inset: 18, borderRadius: shape.large, borderWidth: 1, borderColor: palette.decorativeLine }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: shape.medium, backgroundColor: palette.primaryContainer, alignItems: "center", justifyContent: "center" }}>
            <ShieldCheck size={26} color={palette.onPrimaryContainer} strokeWidth={1.8} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: palette.onNavy, fontSize: 21, lineHeight: 27, fontWeight: "800", letterSpacing: 1.2 }}>{brand.displayName}</Text>
            <Text style={{ color: palette.onNavyMuted, fontSize: 12, lineHeight: 18 }}>{brand.subtitle}</Text>
          </View>
        </View>
        <View style={{ borderTopWidth: 1, borderColor: palette.decorativeLine, paddingTop: 14 }}>
          <Text style={{ color: palette.onNavyMuted, fontSize: 13, lineHeight: 20 }}>{brand.tagline}</Text>
        </View>
      </View>
      <View style={{ backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: shape.large, padding: 20, gap: 18 }}>
        <View style={{ gap: 6, paddingBottom: 18, borderBottomWidth: 1, borderColor: palette.line }}>
          <View style={{ width: 28, height: 3, borderRadius: shape.full, backgroundColor: palette.primary, marginBottom: 4 }} />
          <Text accessibilityRole="header" style={[typography.headline, { color: palette.ink }]}>{heading}</Text>
          <Text style={styles.muted}>{description}</Text>
        </View>
        {mode === "register" && (
          <Field label="Ad soyad" value={name} onChange={setName} editable={!task.pending} outlined />
        )}
        <Field label="E-posta adresi" email value={email} onChange={setEmail} editable={!task.pending} placeholder="ornek@eposta.com" outlined />
        {mode !== "forgot" && (
          <Field
            key={`${mode}-password`}
            label="Parola"
            password
            newPassword={mode === "register"}
            value={password}
            onChange={setPassword}
            editable={!task.pending}
            outlined
            labelAction={mode === "login" ? (
              <TextLink disabled={task.pending} onPress={() => change("forgot")}>Parolamı unuttum</TextLink>
            ) : undefined}
          />
        )}
        {mode === "register" && (
          <View style={{ gap: 10 }}>
            <Field label="Parola tekrar" password newPassword value={confirmation} onChange={setConfirmation} editable={!task.pending} outlined />
            <Text style={styles.muted}>En az 12 karakter; büyük / küçük harf, sayı ve simge.</Text>
          </View>
        )}
        {notice !== "" && (
          <View accessibilityRole="alert" style={{ backgroundColor: palette.softSuccess, padding: 14, borderRadius: shape.medium, flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
            <CheckCircle2 size={20} color={palette.success} />
            <Text style={[styles.muted, { color: palette.success, flex: 1 }]}>{notice}</Text>
          </View>
        )}
        <ErrorNotice error={task.error} />
        <Button disabled={task.pending || !email || (mode !== "forgot" && !password)} onPress={submit}>
          {task.pending
            ? mode === "login" ? "Giriş yapılıyor…" : mode === "register" ? "Hesap oluşturuluyor…" : "Bağlantı gönderiliyor…"
            : mode === "login" ? "Giriş yap" : mode === "register" ? "Hesap oluştur" : "Bağlantı gönder"}
        </Button>
      </View>
      <View style={{ gap: 10, alignItems: "center" }}>
        {mode === "forgot" ? (
          <TextLink disabled={task.pending} onPress={() => change("login")}>Girişe dön</TextLink>
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 6 }}>
            <Text style={styles.muted}>{mode === "login" ? "Henüz hesabın yok mu?" : "Zaten hesabın var mı?"}</Text>
            <TextLink disabled={task.pending} onPress={() => change(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Hesap oluştur" : "Giriş yap"}
            </TextLink>
          </View>
        )}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <GraduationCap size={17} color={palette.muted} />
          <Text style={styles.muted}>Öğrenciler için ücretsiz.</Text>
        </View>
      </View>
    </View>
  );
}

export function Verify({
  refresh,
  logout,
}: {
  refresh: () => void;
  logout: () => void;
}) {
  const { styles } = useTheme();
  const task = useTask<unknown>();
  const [notice, setNotice] = useState("");
  return (
    <>
      <Heading>E-postanı doğrula</Heading>
      <Card>
        <Text style={styles.text}>
          E-postandaki doğrulama bağlantısını tarayıcıda aç ve aynı hesabına
          giriş yap. Sonra uygulamaya dönüp doğrulamayı kontrol et.
        </Text>
        <Button onPress={refresh}>Doğrulamayı kontrol et</Button>
        <Button
          secondary
          disabled={task.pending}
          onPress={() => {
            void task.run(
              () =>
                api.request(
                  "post",
                  "/api/v1/auth/email-verification-notification",
                  {},
                ),
              () => setNotice("Doğrulama e-postası gönderildi."),
            );
          }}
        >
          E-postayı yeniden gönder
        </Button>
        <Button
          secondary
          onPress={() => {
            void task.run(
              () => Linking.openURL(frontendUrl),
              () => {},
            );
          }}
        >
          Web girişini aç
        </Button>
        {notice !== "" && <Text style={styles.text}>{notice}</Text>}
        <ErrorNotice error={task.error} />
        <Button secondary onPress={logout}>
          Çıkış yap
        </Button>
      </Card>
    </>
  );
}
