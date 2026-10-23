import { useState } from "react";
import { Platform, ScrollView, Share, Text, View } from "react-native";
import type { User } from "@oggaq/shared-types";
import { deleteAccountConfirmation, vocabulary } from "@oggaq/study-core";
import { api } from "./api";
import { useResource, useTask } from "./hooks";
import { Badge, Button, Card, ErrorNotice, Field, Heading, Loading, ScreenTitle, SectionTitle } from "./ui";
import { useBody, useTheme } from "./themeContext";

// Hesabım: one card per task. Every change that matters asks for the current password again.
const visibleSessions = 5;
const dateTime = (value: string) => new Date(value).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });

function Notice({ children }: { children: string }) {
  const { palette } = useTheme();
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: palette.softSuccess, padding: 14, borderRadius: 14 }}>
      <Text style={{ color: palette.success, fontSize: 14, lineHeight: 20 }}>{children}</Text>
    </View>
  );
}

function ChangeEmail({ user, refresh }: { user: User; refresh: () => void }) {
  const { styles } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const task = useTask<void>();
  return (
    <>
      <SectionTitle>E-posta adresini değiştir</SectionTitle>
      <Card>
        <Text style={styles.muted}>
          Yeni adrese bir doğrulama bağlantısı gönderilir. Bağlantıyı açana kadar adresin değişmez; eski adresine de haber verilir.
        </Text>
        {user.pending_email ? (
          <Badge tone="neutral">{`Doğrulama bekleyen adres: ${user.pending_email}`}</Badge>
        ) : null}
        {sent && <Notice>Adres uygunsa doğrulama bağlantısı yeni adrese gönderildi. Bağlantıyı bu hesapla giriş yaptığın tarayıcıda aç.</Notice>}
        <ErrorNotice error={task.error} />
        <Field label="Yeni e-posta adresi" email value={email} onChange={setEmail} maxLength={254} />
        <Field label="Mevcut parola" password value={password} onChange={setPassword} maxLength={128} />
        <Button
          disabled={task.pending || email.trim() === "" || password === ""}
          onPress={() => {
            setSent(false);
            void task.run(
              async () => {
                await api.request("post", "/api/v1/me/email", { body: { email: email.trim(), current_password: password } });
              },
              () => {
                setSent(true);
                setPassword("");
                refresh();
              },
            );
          }}
        >
          {task.pending ? "Gönderiliyor…" : "Doğrulama bağlantısı gönder"}
        </Button>
      </Card>
    </>
  );
}

function ChangePassword() {
  const { styles } = useTheme();
  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [changed, setChanged] = useState(false);
  const task = useTask<void>();
  return (
    <>
      <SectionTitle>Parolayı değiştir</SectionTitle>
      <Card>
        <Text style={styles.muted}>Parolayı değiştirince bu cihaz dışındaki bütün cihazların oturumu kapanır.</Text>
        {changed && <Notice>Parolan değiştirildi; diğer cihazlardaki oturumlar kapatıldı.</Notice>}
        <ErrorNotice error={task.error} />
        <Field label="Mevcut parola" password value={current} onChange={setCurrent} maxLength={128} />
        <Field label="Yeni parola" password value={password} onChange={setPassword} maxLength={128} />
        <Text style={styles.muted}>En az 12 karakter; büyük/küçük harf, rakam ve sembol.</Text>
        <Field label="Yeni parola tekrar" password value={confirmation} onChange={setConfirmation} maxLength={128} />
        <Button
          disabled={task.pending || current === "" || password === "" || confirmation === ""}
          onPress={() => {
            setChanged(false);
            void task.run(
              async () => {
                await api.request("post", "/api/v1/me/password", { body: { current_password: current, password, password_confirmation: confirmation } });
              },
              () => {
                setCurrent("");
                setPassword("");
                setConfirmation("");
                setChanged(true);
              },
            );
          }}
        >
          {task.pending ? "Kaydediliyor…" : "Parolayı değiştir"}
        </Button>
      </Card>
    </>
  );
}

function Sessions() {
  const { palette, styles } = useTheme();
  const list = useResource(async (signal) => (await api.request("get", "/api/v1/me/sessions", { signal })).data, []);
  const [showAll, setShowAll] = useState(false);
  const [asking, setAsking] = useState(false);
  const [password, setPassword] = useState("");
  const revoke = useTask<void>();
  const revokeOthers = useTask<void>();
  const items = list.data ?? [];
  const others = items.filter((item) => !item.current);
  return (
    <>
      <SectionTitle>Cihazlar ve oturumlar</SectionTitle>
      <Card>
        <Text style={styles.muted}>Hesabına giriş yapılmış yerler. Tanımadığın bir oturumu kapat ve gerekirse parolanı değiştir.</Text>
        {list.loading ? (
          <Loading />
        ) : list.error ? (
          <ErrorNotice error={list.error} retry={() => void list.reload()} />
        ) : (
          <>
            {(showAll ? items : items.slice(0, visibleSessions)).map((item) => (
              <View key={item.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.line }}>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <Text style={{ color: palette.ink, fontSize: 15, fontWeight: "700" }}>{item.label}</Text>
                    {item.current && <Badge>Bu cihaz</Badge>}
                  </View>
                  <Text style={styles.muted}>
                    {`${item.kind === "mobile" ? "Mobil uygulama" : "Tarayıcı"} · ${item.last_used_at ? `son kullanım ${dateTime(item.last_used_at)}` : "şu an açık"}`}
                  </Text>
                </View>
                {!item.current && (
                  <Button
                    secondary
                    disabled={revoke.pending}
                    onPress={() => void revoke.run(async () => { await api.request("delete", "/api/v1/me/sessions/{session}", { params: { session: item.id } }); }, () => void list.reload())}
                  >
                    {`Çıkış yap`}
                  </Button>
                )}
              </View>
            ))}
            {items.length > visibleSessions && (
              <Button secondary onPress={() => setShowAll(!showAll)}>
                {showAll ? "Daha az göster" : `Tümünü göster (${items.length})`}
              </Button>
            )}
            {others.length === 0 && <Text style={styles.muted}>Başka açık oturum yok.</Text>}
            <ErrorNotice error={revoke.error} />
            {others.length > 0 && !asking && (
              <Button secondary onPress={() => setAsking(true)}>
                Diğer tüm cihazlardan çıkış yap
              </Button>
            )}
            {asking && (
              <>
                <ErrorNotice error={revokeOthers.error} />
                <Field label="Mevcut parola" password value={password} onChange={setPassword} maxLength={128} />
                <Button
                  disabled={revokeOthers.pending || password === ""}
                  onPress={() =>
                    void revokeOthers.run(
                      () => api.request("post", "/api/v1/me/sessions/revoke-others", { body: { current_password: password } }).then(() => undefined),
                      () => {
                        setPassword("");
                        setAsking(false);
                        void list.reload();
                      },
                    )
                  }
                >
                  {revokeOthers.pending ? "Kapatılıyor…" : "Diğer cihazlardan çıkış yap"}
                </Button>
                <Button secondary onPress={() => { setAsking(false); setPassword(""); revokeOthers.reset(); }}>
                  Vazgeç
                </Button>
              </>
            )}
          </>
        )}
      </Card>
    </>
  );
}

// Native: the system share sheet gets the JSON text (save to Files, mail it to yourself). Web preview: a file download.
async function deliver(text: string, filename: string) {
  if (Platform.OS === "web") {
    const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    return;
  }
  await Share.share({ title: filename, message: text });
}

function ExportData() {
  const { styles } = useTheme();
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const task = useTask<void>();
  return (
    <>
      <SectionTitle>Verilerimi indir</SectionTitle>
      <Card>
        <Text style={styles.muted}>
          Profilin, çalışma geçmişin, sınav sonuçların, favorilerin ve soru bildirimlerin tek bir JSON dosyası olarak hazırlanır. Günde en fazla 3 kez indirebilirsin.
        </Text>
        {done && <Notice>Dosya hazırlandı.</Notice>}
        <ErrorNotice error={task.error} />
        <Field label="Mevcut parola" password value={password} onChange={setPassword} maxLength={128} />
        <Button
          disabled={task.pending || password === ""}
          onPress={() => {
            setDone(false);
            void task.run(
              async () => {
                const data = await api.request("post", "/api/v1/me/export", { body: { current_password: password } });
                await deliver(JSON.stringify(data, null, 2), `oggaq-verilerim-${new Date().toISOString().slice(0, 10)}.json`);
              },
              () => {
                setPassword("");
                setDone(true);
              },
            );
          }}
        >
          {task.pending ? "Hazırlanıyor…" : "Verilerimi indir"}
        </Button>
      </Card>
    </>
  );
}

function DeleteAccount({ deleted }: { deleted: () => void }) {
  const { palette, styles } = useTheme();
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const task = useTask<void>();
  return (
    <>
      <SectionTitle>Hesabı sil</SectionTitle>
      <View style={[styles.card, { borderColor: palette.red }]}>
        <Text style={[styles.text, { color: palette.red, fontWeight: "700" }]}>Bu işlem geri alınamaz.</Text>
        <Text style={styles.muted}>
          {"Silinir: hesabın, çalışma geçmişin, sınav denemelerin ve sonuçların, favorilerin, kurum üyeliklerin ve bütün oturumların."}
        </Text>
        <Text style={styles.muted}>
          {"Kalır: soru bildirimlerin soruya ait kayıt olarak durur, ancak sana bağlantısı ve yazdığın not silinir. Sistem kayıtlarında adın ve e-postan tutulmaz."}
        </Text>
        <Text style={styles.muted}>Yedeklerde silinen hesabın verisi, yedek dönemi dolana kadar bulunabilir.</Text>
        <ErrorNotice error={task.error} />
        <Field label="Mevcut parola" password value={password} onChange={setPassword} maxLength={128} />
        <Field label={`Onay için “${deleteAccountConfirmation}” yaz`} value={phrase} onChange={setPhrase} />
        <Button
          danger
          disabled={task.pending || password === "" || phrase !== deleteAccountConfirmation}
          onPress={() =>
            void task.run(
              async () => {
                await api.request("delete", "/api/v1/me", { body: { current_password: password, confirmation: phrase as typeof deleteAccountConfirmation } });
              },
              deleted,
            )
          }
        >
          {task.pending ? "Siliniyor…" : "Hesabımı kalıcı olarak sil"}
        </Button>
      </View>
    </>
  );
}

export function AccountScreen({ user, refresh, finished }: { user: User; refresh: () => void; finished: () => void }) {
  const body = useBody();
  const { styles } = useTheme();
  const [deleted, setDeleted] = useState(false);
  if (deleted)
    return (
      <ScrollView contentContainerStyle={body}>
        <Card>
          <Heading>Hesabın silindi</Heading>
          <Text style={styles.text}>Hesabın ve çalışma geçmişin silindi. Eski e-posta adresine bir onay mesajı gönderdik.</Text>
          <Button onPress={finished}>Girişe dön</Button>
        </Card>
      </ScrollView>
    );
  return (
    <ScrollView contentContainerStyle={body} keyboardShouldPersistTaps="handled">
      <ScreenTitle title={vocabulary.account.title} eyebrow="HESAP VE GİZLİLİK" subtitle={`${user.name} · ${user.email}`} />
      <ChangeEmail user={user} refresh={refresh} />
      <ChangePassword />
      <Sessions />
      <ExportData />
      <DeleteAccount deleted={() => setDeleted(true)} />
    </ScrollView>
  );
}
