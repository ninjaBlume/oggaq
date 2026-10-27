import { useState } from "react";
import { Linking, Pressable, View } from "react-native";
import { notOfficialNotice } from "@oggaq/study-core";
import brand from "../../../config/brand.json";
import { faqGroups } from "./faq-content";
import { useTask } from "./hooks";
import { ChevronDown, ChevronRight, Mail } from "./icons";
import { LegalSection } from "./legal";
import { Text } from "./text";
import { useTheme } from "./themeContext";
import { Button, Card, ErrorNotice, ScreenTitle, SectionTitle } from "./ui";

export function FaqScreen() {
  const { styles, palette } = useTheme();
  const [expanded, setExpanded] = useState<string | null>(null);
  const support = useTask<unknown>();
  const openSupport = () => void support.run(() => Linking.openURL(`mailto:${brand.supportEmail}`), () => {});
  return <>
    <ScreenTitle title="Sıkça Sorulan Sorular" subtitle="Soru çözerken ve hesabını kullanırken merak ettiklerin." />
    {faqGroups.map(group => <View key={group.title} style={{ gap: 10 }}>
      <SectionTitle>{group.title}</SectionTitle>
      <View style={{ borderRadius: 18, borderWidth: 1, borderColor: palette.line, overflow: "hidden", backgroundColor: palette.surface }}>
        {group.items.map((item, index) => {
          const open = expanded === item.id;
          const Icon = open ? ChevronDown : ChevronRight;
          return <View key={item.id} style={index > 0 ? { borderTopWidth: 1, borderColor: palette.line } : undefined}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={item.question}
              accessibilityState={{ expanded: open }}
              aria-expanded={open}
              onPress={() => setExpanded(open ? null : item.id)}
              style={({ pressed }) => [{ minHeight: 52, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: open ? palette.softPrimary : palette.surface }, pressed && { opacity: 0.8 }]}
            >
              <Text style={[styles.text, { flex: 1, fontWeight: "600" }]}>{item.question}</Text>
              <Icon size={18} color={palette.primary} />
            </Pressable>
            {open && <Text testID={`faq-answer-${item.id}`} style={[styles.text, { paddingHorizontal: 14, paddingBottom: 16, paddingTop: 10 }]}>{item.answer}</Text>}
          </View>;
        })}
      </View>
    </View>)}
    <Card tone="blue">
      <SectionTitle>Yanıtını bulamadın mı?</SectionTitle>
      <Text style={styles.muted}>Sorun yaşadığın ekranı ve ne olduğunu kısaca anlat. Parolanı veya doğrulama kodunu paylaşma.</Text>
      <Button secondary icon={Mail} disabled={support.pending} onPress={openSupport}>Destek ekibine yaz</Button>
      <Text style={styles.muted}>{brand.supportEmail}</Text>
      <ErrorNotice title="E-posta uygulaması açılamadı" error={support.error} retry={openSupport} />
    </Card>
    <LegalSection includeAccountDeletion />
    <Text style={[styles.muted, { fontSize: 12 }]}>{notOfficialNotice}</Text>
  </>;
}
