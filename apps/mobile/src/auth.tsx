import { useState } from "react";
import { Linking, Text, View } from "react-native";
import { ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from "./icons";
import brand from "../brand.json";
import { ChoiceGroup } from "./expressive";
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
  StudyHero,
  TextLink,
  palette,
  styles,
} from "./ui";
export function Login({ signedIn }: { signedIn: (user: User) => void }) {
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
          { body: { email, password, device_id: await deviceId() } },
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
  return (
    <>
      <View
        style={{
          backgroundColor: palette.navy,
          borderRadius: shape.extraLarge,
          padding: 26,
          minHeight: 235,
          overflow: "hidden",
        }}
      >
        <View style={[styles.row, { marginBottom: 22 }]}>
          <ShieldCheck size={23} color={palette.accent} />
          <Text
            style={{
              color: palette.white,
              fontSize: 19,
              fontWeight: "800",
              letterSpacing: 2,
            }}
          >
            {brand.displayName}
          </Text>
        </View>
        <Text
          style={{
            color: palette.onNavyMuted,
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 1.5,
          }}
        >
          ÖGG SINAVINA HAZIRLIK
        </Text>
        <Text
          style={{
            color: palette.white,
            ...typography.display,
            marginTop: 10,
            width: "72%",
          }}
        >
          Bir adım daha{"\n"}hazır.
        </Text>
        <View style={{ position: "absolute", right: -12, bottom: 12 }}>
          <StudyHero compact />
        </View>
        <Text
          style={{ color: palette.onNavyMuted, fontSize: 12, marginTop: 14 }}
        >
          Öğren. Pratik yap. Kendine güven.
        </Text>
      </View>
      {mode !== "forgot" && (
        <ChoiceGroup
          choices={[
            {
              value: "login",
              label: "Giriş yap",
              accessibilityLabel: "Giriş sekmesi",
            },
            {
              value: "register",
              label: "Hesap oluştur",
              accessibilityLabel: "Kayıt sekmesi",
            },
          ]}
          value={mode}
          onChange={change}
          disabled={task.pending}
        />
      )}
      <View style={{ gap: 7 }}>
        <Heading>
          {mode === "login"
            ? "Hoş geldin"
            : mode === "register"
              ? "Aramıza katıl"
              : "Parolanı yenile"}
        </Heading>
        <Text style={styles.muted}>
          {mode === "login"
            ? "Kaldığın yerden devam etmeye hazır mısın?"
            : mode === "register"
              ? "Ücretsiz hesabını oluştur, ilk adımını at."
              : "E-postana bir yenileme bağlantısı gönderelim."}
        </Text>
      </View>
      <Card>
        {mode === "register" && (
          <Field
            label="Ad soyad"
            value={name}
            onChange={setName}
            editable={!task.pending}
          />
        )}
        <Field
          label="E-posta adresi"
          email
          value={email}
          onChange={setEmail}
          editable={!task.pending}
        />
        {mode !== "forgot" && (
          <Field
            label="Parola"
            password
            value={password}
            onChange={setPassword}
            editable={!task.pending}
          />
        )}
        {mode === "login" && (
          <View style={{ alignSelf: "flex-end", marginTop: -8 }}>
            <TextLink
              onPress={() => {
                if (!task.pending) change("forgot");
              }}
            >
              Parolamı unuttum
            </TextLink>
          </View>
        )}
        {mode === "register" && (
          <>
            <Field
              label="Parola tekrar"
              password
              value={confirmation}
              onChange={setConfirmation}
              editable={!task.pending}
            />
            <Text style={styles.muted}>
              En az 12 karakter; büyük / küçük harf, sayı ve simge.
            </Text>
          </>
        )}
        {notice && (
          <View
            accessibilityRole="alert"
            style={{
              backgroundColor: palette.softSuccess,
              padding: 14,
              borderRadius: 14,
            }}
          >
            <Text
              style={[styles.text, { fontSize: 14, color: palette.success }]}
            >
              {notice}
            </Text>
          </View>
        )}
        <ErrorNotice error={task.error} />
        <Button
          disabled={task.pending || !email || (mode !== "forgot" && !password)}
          onPress={submit}
          icon={ArrowRight}
        >
          {task.pending
            ? "İşleniyor…"
            : mode === "login"
              ? "Giriş yap"
              : mode === "register"
                ? "Hesap oluştur"
                : "Bağlantı gönder"}
        </Button>
        {mode === "forgot" && (
          <Button
            secondary
            disabled={task.pending}
            onPress={() => change("login")}
            icon={ArrowLeft}
          >
            Girişe dön
          </Button>
        )}
      </Card>
      <View
        style={[styles.row, { justifyContent: "center", paddingBottom: 12 }]}
      >
        <CheckCircle2 size={15} color={palette.muted} />
        <Text style={{ color: palette.muted, fontSize: 11 }}>
          Her gün, kendi hızında bir adım.
        </Text>
      </View>
    </>
  );
}

export function Verify({
  refresh,
  logout,
}: {
  refresh: () => void;
  logout: () => void;
}) {
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
        {notice && <Text style={styles.text}>{notice}</Text>}
        <ErrorNotice error={task.error} />
        <Button secondary onPress={logout}>
          Çıkış yap
        </Button>
      </Card>
    </>
  );
}
