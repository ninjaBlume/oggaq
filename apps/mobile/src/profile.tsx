import { Pressable, Text, View } from "react-native";
import {
  Building2,
  Check,
  LogOut,
  Mail,
  ShieldCheck,
  UserRound,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import brand from "../brand.json";
import {
  Badge,
  Button,
  Card,
  ScreenTitle,
  SectionTitle,
  palette,
  styles,
} from "./ui";
export function Profile({
  user,
  context,
  contexts,
  choose,
  logout,
  pending,
}: {
  user: User;
  context: StudyContext;
  contexts: StudyContext[];
  choose: (id: string) => void;
  logout: () => void;
  pending: boolean;
}) {
  return (
    <>
      <ScreenTitle title="Profilim" subtitle="Hesabın ve çalışma alanların." />
      <View style={{ alignItems: "center", paddingVertical: 20, gap: 12 }}>
        <View
          style={{
            width: 84,
            height: 84,
            borderRadius: 30,
            backgroundColor: palette.softBlue,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 6,
            borderColor: palette.white,
          }}
        >
          <Text
            style={{ fontSize: 29, fontWeight: "800", color: palette.primary }}
          >
            {user.name
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((s) => s.slice(0, 1))
              .join("")
              .toLocaleUpperCase("tr-TR")}
          </Text>
        </View>
        <Text style={[styles.heading, { fontSize: 22 }]}>{user.name}</Text>
        <Badge tone="green">E-posta doğrulandı</Badge>
      </View>
      <SectionTitle>Hesap bilgilerin</SectionTitle>
      <Card>
        <View style={styles.row}>
          <UserRound size={19} color={palette.muted} />
          <Text style={styles.muted}>Ad soyad</Text>
        </View>
        <Text style={styles.text}>{user.name}</Text>
        <View style={{ height: 1, backgroundColor: palette.line }} />
        <View style={styles.row}>
          <Mail size={19} color={palette.muted} />
          <Text style={styles.muted}>E-posta adresi</Text>
        </View>
        <Text style={[styles.text, { fontSize: 14 }]}>{user.email}</Text>
      </Card>
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
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: c.id === context.id ? palette.primary : palette.line,
              backgroundColor:
                c.id === context.id ? palette.softBlue : palette.white,
              padding: 18,
              flexDirection: "row",
              alignItems: "center",
              gap: 14,
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
      <View style={{ paddingTop: 12 }}>
        <Button danger icon={LogOut} disabled={pending} onPress={logout}>
          {pending ? "Oturum kapatılıyor…" : "Çıkış yap"}
        </Button>
      </View>
      <View style={[styles.row, { justifyContent: "center", paddingTop: 12 }]}>
        <ShieldCheck size={15} color={palette.muted} />
        <Text style={[styles.muted, { fontSize: 11 }]}>
          {brand.displayName} · Sınava hazırlık, kendi hızında.
        </Text>
      </View>
    </>
  );
}
