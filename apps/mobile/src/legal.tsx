import { Text } from "./text";
import { Linking, Pressable, View } from "react-native";
import { legalPages, legalUrl, privacyNoticeFile } from "@oggaq/study-core";
import type { LegalPageId } from "@oggaq/study-core";
import { frontendUrl } from "./api";
import { useTask } from "./hooks";
import { useTheme } from "./themeContext";
import { ErrorNotice } from "./ui";

// The public legal pages are static files of the web origin (apps/web/public/legal); the apps open them in the
// system browser, exactly the address a store listing uses.
function useLegalLink(versioned = false) {
  const task = useTask<unknown>();
  const open = (id: LegalPageId) => {
    const url = id === "gizlilik" && versioned ? `${frontendUrl.replace(/\/+$/, '')}${privacyNoticeFile}` : legalUrl(frontendUrl, id);
    void task.run(() => Linking.openURL(url), () => {});
  };
  return { open, error: task.error };
}

// Keep privacy readily accessible without a separate legal card stack.
// Keep support beside privacy/terms; account deletion also remains in Profile → Hesabım.
export function LegalSection({ includeAccountDeletion = false }: { includeAccountDeletion?: boolean }) {
  const { styles } = useTheme();
  const { open, error } = useLegalLink();
  const pages = legalPages.filter(page => page.id === "gizlilik" || page.id === "kosullar" || page.id === "destek" || (includeAccountDeletion && page.id === "hesap-silme"));
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, justifyContent: "center" }}>
        {pages.map((page) => (
          <Pressable
            key={page.id}
            accessibilityRole="link"
            accessibilityLabel={`${page.title} sayfasını aç`}
            onPress={() => open(page.id)}
            style={({ pressed }) => [{ minHeight: 44, justifyContent: "center" }, pressed && { opacity: 0.8 }]}
          >
            <Text style={[styles.link, { fontSize: 12 }]}>{page.title}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorNotice error={error} />
    </View>
  );
}

// Under the auth forms: the pages as text links; on the registration form also the "by registering" notice.
export function AuthLegal({ register }: { register: boolean }) {
  const { styles } = useTheme();
  const { open, error } = useLegalLink(true);
  const terms = legalPages.find((page) => page.id === "kosullar")!;
  const privacy = legalPages.find((page) => page.id === "gizlilik")!;
  return (
    <View style={{ gap: 4, alignItems: "center" }}>
      {register && (
        <Text style={[styles.muted, { fontSize: 12, textAlign: "center" }]}>
          {"Kayıt olarak "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => open("kosullar")}>{terms.title}</Text>
          {"’nı kabul edersin. Verilerinin işlenmesini "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => open("gizlilik")}>{privacy.title}</Text>
          {"’nda açıklıyoruz. Bu, açık rıza talebi değildir."}
        </Text>
      )}
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "center", columnGap: 14 }}>
        {legalPages.map((page) => (
          <Pressable
            key={page.id}
            accessibilityRole="link"
            accessibilityLabel={`${page.title} sayfasını aç`}
            onPress={() => open(page.id)}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[styles.muted, { fontSize: 12, textDecorationLine: "underline" }]}>{page.title}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorNotice error={error} />
    </View>
  );
}

export function PrivacyNoticeLink() {
  const { styles } = useTheme();
  const { open, error } = useLegalLink(true);
  return <View><Text style={[styles.muted, { fontSize: 12 }]}>Codentum’un veri işleme amaçları, alıcıları, saklama süreleri ve hakların için <Text accessibilityRole="link" style={styles.link} onPress={() => open("gizlilik")}>KVKK aydınlatma metni</Text>.</Text><ErrorNotice error={error} /></View>;
}
