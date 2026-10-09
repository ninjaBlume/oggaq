import { useState } from "react";
import { Linking, Text } from "react-native";
import type { User } from "@oggaq/shared-types";
import { api, frontendUrl } from "./api";
import { deviceId, session } from "./storage";
import { useTask } from "./hooks";
import { Button, Card, ErrorNotice, Field, Heading, styles } from "./ui";
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
      <Heading>
        {mode === "login"
          ? "Hoş geldin"
          : mode === "register"
            ? "Hesap oluştur"
            : "Parolanı yenile"}
      </Heading>
      <Text style={styles.muted}>
        Ders çalış, süreli deneme çöz ve geçmişine her cihazından ulaş.
      </Text>
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
          <Text accessibilityRole="alert" style={styles.text}>
            {notice}
          </Text>
        )}
        <ErrorNotice error={task.error} />
        <Button
          disabled={task.pending || !email || (mode !== "forgot" && !password)}
          onPress={submit}
        >
          {task.pending
            ? "İşleniyor…"
            : mode === "login"
              ? "Giriş yap"
              : mode === "register"
                ? "Hesap oluştur"
                : "Bağlantı gönder"}
        </Button>
        {mode === "login" ? (
          <>
            <Button
              secondary
              disabled={task.pending}
              onPress={() => change("register")}
            >
              Hesap oluştur
            </Button>
            <Button
              secondary
              disabled={task.pending}
              onPress={() => change("forgot")}
            >
              Parolamı unuttum
            </Button>
          </>
        ) : (
          <Button
            secondary
            disabled={task.pending}
            onPress={() => change("login")}
          >
            Girişe dön
          </Button>
        )}
      </Card>
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
