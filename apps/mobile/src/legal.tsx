import { Linking, Pressable, Text, View } from "react-native";
import { legalPages, legalUrl, notOfficialNotice } from "@oggaq/study-core";
import type { LegalPageId } from "@oggaq/study-core";
import brand from "../brand.json";
import { frontendUrl } from "./api";
import { useTask } from "./hooks";
import { ExternalLink } from "./icons";
import { useTheme } from "./themeContext";
import { ErrorNotice } from "./ui";

// The public legal pages are static files of the web origin (apps/web/public/legal); the apps open them in the
// system browser, exactly the address a store listing uses.
function useLegalLink() {
  const task = useTask<unknown>();
  const open = (id: LegalPageId) => {
    void task.run(() => Linking.openURL(legalUrl(frontendUrl, id)), () => {});
  };
  return { open, error: task.error };
}

// Profil → "Yasal ve destek": one row per page, the "not an official app" line and, when configured, the support address.
export function LegalSection() {
  const { palette, styles } = useTheme();
  const { open, error } = useLegalLink();
  return (
    <View style={{ gap: 10 }}>
      {legalPages.map((page) => (
        <Pressable
          key={page.id}
          accessibilityRole="link"
          accessibilityLabel={`${page.title} sayfasını aç`}
          onPress={() => open(page.id)}
          style={({ pressed }) => [
            {
              minHeight: 52,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.line,
              backgroundColor: palette.surface,
              paddingHorizontal: 14,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Text style={{ flex: 1, color: palette.ink, fontSize: 14, fontWeight: "600" }}>{page.title}</Text>
          <ExternalLink size={18} color={palette.muted} />
        </Pressable>
      ))}
      {brand.supportEmail !== "" && (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`Destek e-postası: ${brand.supportEmail}`}
          onPress={() => void Linking.openURL(`mailto:${brand.supportEmail}`)}
          style={{ minHeight: 44, justifyContent: "center" }}
        >
          <Text style={styles.link}>{brand.supportEmail}</Text>
        </Pressable>
      )}
      <ErrorNotice error={error} />
      <Text style={styles.muted}>{notOfficialNotice}</Text>
    </View>
  );
}

// Under the auth forms: the pages as text links; on the registration form also the "by registering" notice.
export function AuthLegal({ register }: { register: boolean }) {
  const { styles } = useTheme();
  const { open, error } = useLegalLink();
  const terms = legalPages.find((page) => page.id === "kosullar")!;
  const privacy = legalPages.find((page) => page.id === "gizlilik")!;
  return (
    <View style={{ gap: 4, alignItems: "center" }}>
      {register && (
        <Text style={[styles.muted, { fontSize: 12, textAlign: "center" }]}>
          {"Kayıt olarak "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => open("kosullar")}>{terms.title}</Text>
          {"’nı ve "}
          <Text accessibilityRole="link" style={styles.link} onPress={() => open("gizlilik")}>{privacy.title}</Text>
          {"’nı okuduğunu kabul edersin."}
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
