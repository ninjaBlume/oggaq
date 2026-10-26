import { Text } from "./text";
import { Pressable, View } from "react-native";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  ChevronRight,
  Clock3,
  History,
  ListChecks,
  Play,
  ShieldCheck,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { ExpressivePressable } from "./expressive";
import { examDisplayTitle, vocabulary } from "@oggaq/study-core";
import { scoreTone, shape } from "./theme";
import { api } from "./api";
import { useResource, useOnReturn } from "./hooks";
import {
  Badge,
  ErrorNotice,
  Loading,
  SectionTitle,
  TextLink,
} from "./ui";
import { useLayout, useTheme } from "./themeContext";
export function Home({
  user,
  context,
  deneme,
  ders,
  history,
  review,
  stats,
  exam,
}: {
  user: User;
  context: StudyContext;
  deneme: () => void;
  ders: (subject?: string) => void;
  history: () => void;
  review: () => void;
  stats: () => void;
  exam: (id: string) => void;
}) {
  const { palette, styles } = useTheme();
  const layout = useLayout();
  // Reuse the real summary; missing data is never displayed as invented zeros.
  const summary = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/stats", {
        signal,
        params: { context: context.id },
      }),
    [context.id],
  );
  useOnReturn(() => {
    void summary.reload();
  });
  const accuracy = summary.data?.data.answers.accuracy_percent;
  const recentExams = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        signal,
        params: { context: context.id },
        query: { per_page: 3 },
      }),
    [context.id],
  );
  useOnReturn(() => {
    void recentExams.reload();
  });
  const activeExam = recentExams.data?.data.find((e) => e.status === "active" && Date.parse(e.deadline_at) > Date.parse(e.server_time));
  const totals = summary.data?.data;
  const metrics = [
    { label: "Soru", accessible: "Değerlendirilen soru", value: totals?.answers.total.toLocaleString("tr-TR"), icon: BookOpen },
    { label: "Doğruluk", accessible: "Doğruluk", value: typeof accuracy === "number" ? `%${accuracy.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : undefined, icon: ChartColumn },
    { label: "Biten sınav", accessible: "Tamamlanan sınav", value: totals?.exams.completed.toLocaleString("tr-TR"), icon: ListChecks },
  ];
  return (
    <>
      <View style={{ gap: 4 }}>
        <Text accessibilityRole="header" style={[styles.heading, { fontSize: 22, lineHeight: 28 }]}>
          {`Merhaba, ${user.name.trim().split(/\s+/)[0]}.`}
        </Text>
        <Text style={styles.muted}>Bir sınav seç, kaldığın yerden devam et.</Text>
      </View>

      <View style={{ flexDirection: layout.columns === 2 ? "row" : "column", gap: 20 }}>
      <View testID="home-focus" style={{ flex: layout.columns === 2 ? 2 : undefined, backgroundColor: palette.navy, borderRadius: shape.large, padding: layout.cardPadding + 4, gap: 14, overflow: "hidden" }}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", width: 210, height: 280, right: -120, top: -70, borderRadius: shape.extraLarge, backgroundColor: palette.primary, opacity: 0.24, transform: [{ rotate: "-18deg" }] }} />
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", width: 170, height: 170, right: -38, bottom: -115, borderRadius: 85, borderWidth: 1, borderColor: palette.decorativeLine }} />
        <View style={[styles.between, { flexWrap: "wrap" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <ShieldCheck size={17} color={palette.onNavyMuted} />
            <Text style={{ color: palette.onNavyMuted, fontSize: 12, lineHeight: 18, fontWeight: "700" }}>SINAVA HAZIRLIK</Text>
          </View>
          <View style={{ borderWidth: 1, borderColor: palette.decorativeLine, paddingHorizontal: 9, paddingVertical: 4, borderRadius: shape.small }}>
            <Text style={{ color: palette.onNavy, fontSize: 12, fontWeight: "600" }}>{activeExam ? "Devam ediyor" : "Çıkmış sorular"}</Text>
          </View>
        </View>
        <View style={{ gap: 7 }}>
          <Text accessibilityRole="header" style={{ color: palette.onNavy, fontSize: 24, lineHeight: 31, fontWeight: "700" }}>
            {activeExam ? "Kaldığın yerden devam et" : "Deneme sınavına başla"}
          </Text>
          <Text style={{ color: palette.onNavyMuted, fontSize: 14, lineHeight: 22 }}>
            {activeExam
              ? activeExam.official_exam ? examDisplayTitle(activeExam.official_exam.title) : `${activeExam.question_count} soruluk deneme`
              : "Silahlı veya silahsız sınavını seç, soruları çöz ve sonucunu incele."}
          </Text>
          {activeExam && <Text style={{ color: palette.onNavyMuted, fontSize: 12, lineHeight: 18 }}>{activeExam.question_count} soru · {activeExam.timer_paused ? "Süre duraklatıldı" : "Süren işlemeye devam ediyor"}</Text>}
        </View>
        <ExpressivePressable radius={shape.control} pressedRadius={shape.controlPressed}
          accessibilityRole="button" accessibilityLabel={activeExam ? "Denemene devam et" : "Sınava gir"}
          onPress={activeExam ? () => exam(activeExam.id) : deneme}
          style={{ minHeight: 54, borderRadius: shape.control, paddingVertical: 14, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 9, backgroundColor: palette.onNavy }}>
          {activeExam ? <Play size={18} color={palette.navy} /> : <ArrowRight size={18} color={palette.navy} />}
          <Text style={{ color: palette.navy, fontSize: 15, lineHeight: 22, fontWeight: "700" }}>{activeExam ? "Denemene devam et" : "Sınava gir"}</Text>
        </ExpressivePressable>
        {activeExam ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Diğer sınavları gör" onPress={deneme} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ color: palette.onNavyMuted, fontSize: 13, fontWeight: "600" }}>Diğer sınavları gör</Text>
          </Pressable>
        ) : recentExams.loading && !recentExams.data ? (
          <Text accessibilityLiveRegion="polite" style={{ color: palette.onNavyMuted, fontSize: 12, lineHeight: 18 }}>Devam eden sınavların kontrol ediliyor…</Text>
        ) : null}
      </View>

      <View testID="home-summary" style={{ flex: layout.columns === 2 ? 1 : undefined, justifyContent: "space-between", gap: 12 }}>
        <View style={styles.between}>
          <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "600" }}>Genel durumun</Text>
          <TextLink onPress={stats}>Detayları gör</TextLink>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {metrics.map(({ label, accessible, value, icon: Icon }) => (
            <View key={label} accessible accessibilityLabel={`${accessible}: ${value ?? (summary.loading ? "yükleniyor" : "henüz yok")}`}
              style={{ flex: 1, minWidth: 0, gap: 5, padding: 10, backgroundColor: palette.surface, borderWidth: 1, borderRadius: shape.control, borderColor: palette.line }}>
              <View style={{ width: 28, height: 28, borderRadius: shape.small, alignItems: "center", justifyContent: "center", backgroundColor: palette.softPrimary }}>
                <Icon size={17} color={palette.primary} strokeWidth={1.8} />
              </View>
              <Text style={{ color: palette.ink, fontSize: 22, lineHeight: 29, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value ?? "—"}</Text>
              <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>{label}</Text>
            </View>
          ))}
        </View>
        <ErrorNotice title="Özet bilgilerin yüklenemedi" error={summary.error} retry={() => void summary.reload()} />
      </View>
      </View>

      <View style={{ flexDirection: layout.columns === 2 ? "row" : "column", gap: 20 }}>
      <View testID="home-quick-start" style={{ flex: layout.columns === 2 ? 1 : undefined, gap: 12 }}>
      <SectionTitle>Hızlı başla</SectionTitle>
      <HomeGroup>
        <HomeRow icon={BookOpen} title={vocabulary.ders.title} description="Dersini seç, ilgili sınavlara ulaş" onPress={() => ders()} />
        <HomeRow icon={Clock3} title={vocabulary.deneme.title} description="Silahlı veya silahsız sınavını seç" onPress={deneme} />
        <HomeRow icon={ListChecks} title={vocabulary.review.title} description="Yanlış, boş ve favori sorularından sınav yap"
          accessibilityLabel={`${vocabulary.review.title} ekranını aç`} onPress={review} />
      </HomeGroup>
      </View>
      <View style={{ flex: layout.columns === 2 ? 1 : undefined, gap: 12 }}>
      <SectionTitle>Çalışmaların</SectionTitle>
      <HomeGroup>
        <HomeRow icon={History} title={vocabulary.results.title} description="Girdiğin sınavları ve cevaplarını incele" onPress={history} />
        <HomeRow icon={ChartColumn} title={vocabulary.stats.title}
          description={typeof accuracy === "number" ? `Doğruluk %${accuracy.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "İlerlemeni ve derslere göre durumunu gör"}
          accessibilityLabel={`${vocabulary.stats.title} ekranını aç`} onPress={stats} />
      </HomeGroup>
      </View>
      </View>

      <SectionTitle action="Tümünü gör" onPress={history}>Son sınavların</SectionTitle>
      {recentExams.loading && !recentExams.data ? (
        <Loading layout="list" label="Son sınavların yükleniyor" />
      ) : recentExams.error ? (
        <ErrorNotice title="Son sınavların yüklenemedi" error={recentExams.error} retry={() => void recentExams.reload()} />
      ) : recentExams.data?.data.length === 0 ? (
        <HomeGroup>
          <View style={{ padding: 16, gap: 8, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.line, borderRadius: shape.control }}>
            <Text style={[styles.text, { fontWeight: "600" }]}>İlk sınavın burada</Text>
            <Text style={styles.muted}>Girdiğin deneme ve ders sınavlarını burada görebilirsin.</Text>
            <TextLink onPress={deneme}>Deneme sınavlarına git</TextLink>
          </View>
        </HomeGroup>
      ) : (
        <HomeGroup>
          {recentExams.data?.data.map(attempt => {
            const title = attempt.official_exam ? examDisplayTitle(attempt.official_exam.title) : `${attempt.question_count} soruluk deneme`;
            const status = attempt.status === "active"
              ? Date.parse(attempt.deadline_at) > Date.parse(attempt.server_time) ? "Devam ediyor" : "Süresi doldu"
              : attempt.result ? `%${attempt.result.score_percent} doğru` : "Sonuç bekleniyor";
            return <HomeRow key={attempt.id} icon={Clock3} title={title}
              description={new Date(attempt.started_at).toLocaleDateString("tr-TR")}
              accessibilityLabel={`${title}, ${status}`} onPress={() => exam(attempt.id)}
              badge={<Badge tone={attempt.status === "completed" && attempt.result ? scoreTone(attempt.result.score_percent, palette).badge : "primary"}>{status}</Badge>} />;
          })}
        </HomeGroup>
      )}
    </>
  );
}

function HomeGroup({ children }: { children: ReactNode }) {
  return <View style={{ gap: 10 }}>{children}</View>;
}

function HomeRow({ icon: Icon, title, description, accessibilityLabel, onPress, badge }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  badge?: ReactNode;
}) {
  const { palette } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `${title} ekranını aç`} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 76, padding: 14, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pressed ? palette.softPrimary : palette.surface,
      borderWidth: 1, borderColor: palette.line, borderRadius: shape.control })}>
    <View style={{ width: 44, height: 44, borderRadius: shape.control, alignItems: "center", justifyContent: "center", backgroundColor: palette.softPrimary }}>
      <Icon size={21} color={palette.primary} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
      <Text style={{ color: palette.ink, fontSize: 15, lineHeight: 22, fontWeight: "600" }}>{title}</Text>
      {description && <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>{description}</Text>}
      {badge}
    </View>
    <ChevronRight size={17} color={palette.muted} />
  </Pressable>;
}
