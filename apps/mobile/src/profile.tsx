import { Text } from "./text";
import { BrandWordmark } from "./wordmark";
import { Pressable, View } from "react-native";
import {
  Building2,
  Check,
  ChevronRight,
  LogOut,
  ShieldCheck,
  UserRound,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import brand from "../../../config/brand.json";
import {
  Button,
  Card,
  ErrorNotice,
  ScreenTitle,
  SectionTitle,
} from "./ui";
import { useTheme } from "./themeContext";
import { ChoiceGroup } from "./expressive";
import { LegalSection } from "./legal";
import { displayPersonName, personInitials, vocabulary } from "@oggaq/study-core";
import { cardTone, themePreferenceLabels, themePreferences } from "@oggaq/design-tokens";
import { textSizes, textSizeLabels } from "./textSize";
import Constants from "expo-constants";
import * as Updates from "expo-updates";
import { AppUpdateControls } from "./appUpdates";
import { appUpdatesEnabled } from "./appUpdateEnvironment";
export function Profile({
  user,
  context,
  contexts,
  choose,
  logout,
  pending,
  account,
  home,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
  account: () => void;
  home: () => void;
}) {
  const { palette, styles, preference, setPreference, textSize, setTextSize, textSizeError } = useTheme();
  const accountTint = cardTone(palette, "indigo");
  const initials = personInitials(user.name);
  return (
    <View style={{ gap: 12 }}>
      <ScreenTitle
        title={vocabulary.profile.title}
        subtitle="Hesabın ve uygulama tercihlerin."
      />
      <Card tone="blue" compact>
      <View testID="profile-identity" style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 20,
            backgroundColor: palette.softPrimary,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 3,
            borderColor: palette.surface,
          }}
        >
          {initials ? <Text testID="profile-initials" numberOfLines={1} adjustsFontSizeToFit style={{ fontSize: initials.length > 2 ? 20 : 24, fontWeight: "800", color: palette.primary }}>
            {initials}
          </Text> : <UserRound size={24} color={palette.primary} />}
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text testID="profile-full-name" style={[styles.heading, { fontSize: 18, lineHeight: 25 }]}>{displayPersonName(user.name)}</Text>
          <Text testID="profile-email" accessibilityLabel={`E-posta adresi: ${user.email}`} style={[styles.muted, { fontSize: 13, lineHeight: 19 }]}>{user.email}</Text>
        </View>
      </View>
      </Card>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${vocabulary.account.title}: e-posta, parola, cihazlar, verilerin, hesabı sil`}
        onPress={account}
        style={({ pressed }) => [
          {
            borderRadius: 16,
            borderWidth: 1.5,
            borderColor: accountTint.line,
            backgroundColor: accountTint.surface,
            paddingHorizontal: 12,
            paddingVertical: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            minHeight: 52,
          },
          pressed && { opacity: 0.8 },
        ]}
      >
        <ShieldCheck size={22} color={accountTint.accent} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "700" }}>
            {vocabulary.account.title}
          </Text>
          <Text style={styles.muted}>
            Güvenlik ve hesap ayarları.
          </Text>
        </View>
        <ChevronRight size={20} color={palette.muted} />
      </Pressable>
      <View style={{ gap: 8 }}>
      <SectionTitle>Görünüm</SectionTitle>
      <Text style={styles.muted}>
        İlk kurulumda Açık görünüm kullanılır. Koyu veya Cihaz ayarı seçebilirsin.
      </Text>
      <ChoiceGroup
        choices={themePreferences.map((value) => ({
          value,
          label: themePreferenceLabels[value],
          accessibilityLabel: `Görünüm: ${themePreferenceLabels[value]}`,
        }))}
        value={preference}
        onChange={setPreference}
      />
      </View>
      <View style={{ gap: 8 }}>
      <SectionTitle>Yazı boyutu</SectionTitle>
      <Text style={styles.muted}>Okumayı kolaylaştırmak için yazı boyutunu seç. Tercihin bu cihazda saklanır.</Text>
      <ChoiceGroup
        choices={textSizes.map(value => ({ value, label: textSizeLabels[value], accessibilityLabel: `Yazı boyutu: ${textSizeLabels[value]}` }))}
        value={textSize}
        onChange={setTextSize}
      />
      <Card tone="indigo" compact>
        <Text style={styles.text}>Örnek metin: Soruları ve seçenekleri rahatça oku.</Text>
      </Card>
      <ErrorNotice title="Yazı boyutu tercihi saklanamadı" error={textSizeError} retry={() => setTextSize(textSize)} />
      </View>
      {contexts.length > 1 && (
        <>
          <SectionTitle>Çalışma alanın</SectionTitle>
          <Text style={styles.muted}>
            Seçtiğin alandaki sorular ve geçmişin gösterilir.
          </Text>
          {contexts.map((c) => (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityLabel={`${c.name} çalışma alanını seç`}
              accessibilityState={{ selected: c.id === context.id }}
              onPress={() => choose(c.id)}
              style={({ pressed }) => [
                {
                  borderRadius: 16,
                  borderWidth: 1.5,
                  borderColor: c.id === context.id ? palette.primary : palette.line,
                  backgroundColor:
                    c.id === context.id ? palette.softPrimary : palette.surface,
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  minHeight: 44,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              {c.kind === "personal" ? (
                <UserRound size={22} color={palette.primary} />
              ) : (
                <Building2 size={22} color={palette.primary} />
              )}
              <View style={{ flex: 1, gap: 4 }}>
                <Text
                  style={{ color: palette.ink, fontSize: 14, fontWeight: "700" }}
                >
                  {c.name}
                </Text>
                <Text style={styles.muted}>
                  {c.kind === "personal"
                    ? "Sadece sana ait"
                    : "Kurum çalışma alanı"}
                </Text>
              </View>
              {c.id === context.id && <Check size={20} color={palette.primary} />}
            </Pressable>
          ))}
        </>
      )}
      <LegalSection />
      <AppUpdateControls />
      <View style={{ paddingTop: 4 }}>
        <Button compact danger icon={LogOut} disabled={pending} onPress={logout}>
          {pending ? "Oturum kapatılıyor…" : "Çıkış yap"}
        </Button>
      </View>
      <Pressable
        testID="profile-brand-home"
        accessibilityRole="button"
        accessibilityLabel={`${brand.name} ana sayfaya dön`}
        onPress={home}
        style={[styles.row, { justifyContent: "center", minHeight: 44 }]}
      >
        <ShieldCheck size={15} color={palette.muted} />
        <Text style={[styles.muted, { fontSize: 11 }]}>
          <BrandWordmark />{` - ${brand.subtitle}`}
        </Text>
      </Pressable>
      <Text testID="app-release" style={[styles.muted, { fontSize: 11, textAlign: "center" }]}>
        {`Sürüm ${Constants.expoConfig?.version ?? "—"}`}
        {appUpdatesEnabled && !Updates.isEmbeddedLaunch && Updates.updateId
          ? ` · Güncelleme ${Updates.updateId.slice(0, 8)}`
          : ""}
      </Text>
    </View>
  );
}
