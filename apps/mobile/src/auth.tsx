import { Text } from "./text";
import { BrandWordmark } from "./wordmark";
import { BrandLogo } from "./brandLogo";
import { useState } from "react";
import { Platform, View } from "react-native";
import { CheckCircle2, GraduationCap } from "./icons";
import brand from "../../../config/brand.json";
import { shape, typography } from "./theme";
import type { User } from "@oggaq/shared-types";
import { api } from "./api";
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
import { AuthLegal } from "./legal";

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
        let response;
        try {
          response = await api.request(
            "post",
            "/api/v1/auth/mobile-tokens",
            { body: { email, password, device_id: await deviceId(), device_platform: devicePlatform } },
          );
        } catch (error) {
          // If registration succeeded but sign-in failed, retry sign-in, never create another account.
          if (mode === "register") {
            setMode("login");
            setNotice("Hesabın oluşturuldu. Giriş yaparak kaldığın yerden devam edebilirsin.");
            setPassword("");
            setConfirmation("");
          }
          throw error;
        }
        try {
          await session.save({
            token: response.data.token,
            expiresAt: response.data.expires_at,
          });
        } catch (error) {
          // Do not orphan a newly issued token if native secure storage is locked.
          if (mode === "register") {
            setMode("login");
            setNotice("Hesabın oluşturuldu. Giriş yaparak kaldığın yerden devam edebilirsin.");
            setPassword("");
            setConfirmation("");
          }
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
        setConfirmation("");
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
      ? "Hesabınla sınavlarını ve sonuçlarını takip et."
      : "E-posta adresine parola yenileme bağlantısı gönderelim.";
  return (
    <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 20, paddingTop: 12 }}>
      <View style={{ backgroundColor: palette.navy, borderRadius: shape.large, padding: 22, gap: 18, overflow: "hidden" }}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: "absolute", right: -36, top: -42, width: 156, height: 156, borderRadius: shape.extraLarge, borderWidth: 1, borderColor: palette.decorativeLine, transform: [{ rotate: "25deg" }] }}>
          <View style={{ position: "absolute", inset: 18, borderRadius: shape.large, borderWidth: 1, borderColor: palette.decorativeLine }} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <BrandLogo size={84} />
          <View style={{ flex: 1, gap: 3 }}>
            <BrandWordmark style={{ color: palette.onNavy, fontSize: 21, lineHeight: 27 }} />
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
          <Field label="Ad soyad" personName maxLength={100} placeholder="Örn. Ayşe Deniz Yılmaz" value={name} onChange={setName} editable={!task.pending} outlined />
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
        {mode === "login" && <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7 }}>
          <GraduationCap size={17} color={palette.muted} />
          <Text style={styles.muted}>Öğrenciler için ücretsiz.</Text>
        </View>}
        <AuthLegal register={mode === "register"} />
      </View>
    </View>
  );
}

export function Verify({
  user,
  verified,
  refresh,
  logout,
}: {
  user: User;
  verified: (user: User) => void;
  refresh: () => void;
  logout: () => void;
}) {
  const { styles } = useTheme();
  const task = useTask<User | null>();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <View style={{ width: "100%", maxWidth: 480, alignSelf: "center", gap: 18, paddingTop: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <BrandLogo size={64} />
        <BrandWordmark />
      </View>
      <Heading>Son bir adım: e-postanı doğrula</Heading>
      <Card>
        <Text style={styles.text}>
          {user.email} adresine gönderdiğimiz 6 haneli kodu gir. Doğrulanınca doğrudan uygulamaya geçeceksin.
        </Text>
        <Field label="Doğrulama kodu" oneTimeCode numeric outlined placeholder="6 haneli kod" value={code} editable={!task.pending}
          onChange={(value) => { setCode(value.replace(/\s/g, "").replace(/[^0-9]/g, "").slice(0, 6)); task.reset(); }} />
        <Text style={styles.muted}>Kod 10 dakika geçerlidir. E-postayı göremiyorsan spam klasörünü de kontrol et. Yeni kod istemek için bir dakika bekle.</Text>
        <Button disabled={task.pending || code.length !== 6} onPress={() => {
          void task.run(async () => (await api.request("post", "/api/v1/auth/email-verification-code", { body: { code } })).data,
            (updated) => { if (updated) verified(updated); });
        }}>{task.pending ? "İşlem yapılıyor…" : "Doğrula ve başla"}</Button>
        <Button
          secondary
          disabled={task.pending}
          onPress={() => {
            void task.run(
              async () => {
                await api.request(
                  "post",
                  "/api/v1/auth/email-verification-notification",
                  {},
                );
                return null;
              },
              () => { setCode(""); setNotice("Yeni kod gönderildi. E-postandaki en son kodu kullan."); },
            );
          }}
        >
          Yeni kod gönder
        </Button>
        <TextLink disabled={task.pending} onPress={refresh}>Bağlantıyla doğruladım, kontrol et</TextLink>
        {notice !== "" && <Text style={styles.text}>{notice}</Text>}
        <ErrorNotice error={task.error} />
        <Button secondary disabled={task.pending} onPress={logout}>
          Başka hesap kullan
        </Button>
      </Card>
    </View>
  );
}
