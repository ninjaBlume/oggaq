import { featureIcons } from "./featureIcons";
import { UpcomingExamCard } from "./upcomingExam";
import { Text } from "./text";
import { Pressable, View } from "react-native";
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react-native";
import {
  ArrowRight,
  ChevronRight,
  ListChecks,
  Play,
  ClipboardList,
  ClipboardCheck,
  CirclePercent,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { ExpressivePressable } from "./expressive";
import { examDisplayTitle, vocabulary } from "@oggaq/study-core";
import { cardDensity, cardTone, type CardTone } from "@oggaq/design-tokens";
import { buttonDensity, scoreTone, shape } from "./theme";
import { api } from "./api";
import { useResource, useOnReturn } from "./hooks";
import {
  Badge,
  ReadNotice,
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
  calendar,
}: {
  user: User;
  context: StudyContext;
  deneme: () => void;
  ders: (subject?: string) => void;
  history: () => void;
  review: () => void;
  stats: () => void;
  exam: (id: string) => void;
  calendar: (year?: number) => void;
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
    { label: "Soru", accessible: "Değerlendirilen soru", tone: "blue" as const, value: totals?.answers.total.toLocaleString("tr-TR"), icon: ListChecks },
    { label: "Doğruluk", accessible: "Doğruluk", tone: "indigo" as const, value: typeof accuracy === "number" ? `%${accuracy.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : undefined, icon: CirclePercent },
    { label: "Biten sınav", accessible: "Tamamlanan sınav", tone: "sand" as const, value: totals?.exams.completed.toLocaleString("tr-TR"), icon: ClipboardCheck },
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
      <View style={{ flex: layout.columns === 2 ? 2 : undefined, gap: 12 }}>
      <View testID="home-focus" style={{ backgroundColor: palette.navy, borderRadius: shape.large, padding: layout.cardPadding + 2, gap: 12, overflow: "hidden" }}>
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", width: 210, height: 280, right: -120, top: -70, borderRadius: shape.extraLarge, backgroundColor: palette.primary, opacity: 0.24, transform: [{ rotate: "-18deg" }] }} />
        <View pointerEvents="none" accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
          style={{ position: "absolute", width: 170, height: 170, right: -38, bottom: -115, borderRadius: 85, borderWidth: 1, borderColor: palette.decorativeLine }} />
        <View style={[styles.between, { flexWrap: "wrap" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7 }}>
            <ClipboardList size={17} color={palette.onNavyMuted} />
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
          style={{ ...buttonDensity.standard, borderRadius: shape.control, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: palette.onNavy }}>
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
      <UpcomingExamCard open={calendar} />
      </View>

      <View testID="home-summary" style={{ flex: layout.columns === 2 ? 1 : undefined, justifyContent: "flex-start", gap: 12 }}>
        <View style={styles.between}>
          <Text style={{ color: palette.ink, fontSize: 14, fontWeight: "600" }}>Genel durumun</Text>
          <TextLink onPress={stats}>Detayları gör</TextLink>
        </View>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {metrics.map(({ label, accessible, value, icon: Icon, tone }) => {
            const tint = cardTone(palette, tone);
            return (
            <View key={label} accessible accessibilityLabel={`${accessible}: ${value ?? (summary.loading && !summary.data ? "yükleniyor" : "henüz yok")}`}
              style={{ flex: 1, minWidth: 0, gap: 5, padding: 10, backgroundColor: tint.surface, borderWidth: 1, borderRadius: shape.control, borderColor: tint.line }}>
              <View style={{ width: 28, height: 28, borderRadius: shape.small, alignItems: "center", justifyContent: "center", backgroundColor: tint.iconSurface }}>
                <Icon size={17} color={tint.accent} strokeWidth={1.8} />
              </View>
              <Text style={{ color: palette.ink, fontSize: 22, lineHeight: 29, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{value ?? "—"}</Text>
              <Text style={{ color: palette.muted, fontSize: 12, lineHeight: 18 }}>{label}</Text>
            </View>
          );})}
        </View>
        <ReadNotice title="Özet bilgilerin yüklenemedi" resource={summary} />
      </View>
      </View>

      <View style={{ flexDirection: layout.columns === 2 ? "row" : "column", gap: 20 }}>
      <View testID="home-quick-start" style={{ flex: layout.columns === 2 ? 1 : undefined, gap: 12 }}>
      <SectionTitle>Hızlı başla</SectionTitle>
      <HomeGroup>
        <HomeRow icon={featureIcons.ders} tone="indigo" title={vocabulary.ders.title} description="Dersini seç, ilgili sınavlara ulaş" onPress={() => ders()} />
        <HomeRow icon={featureIcons.deneme} tone="blue" title={vocabulary.deneme.title} description="Silahlı veya silahsız sınavını seç" onPress={deneme} />
        <HomeRow icon={featureIcons.review} tone="sand" title={vocabulary.review.title} description="Yanlış, boş ve favori sorularından sınav yap"
          accessibilityLabel={`${vocabulary.review.title} ekranını aç`} onPress={review} />
      </HomeGroup>
      </View>
      <View style={{ flex: layout.columns === 2 ? 1 : undefined, gap: 12 }}>
      <SectionTitle>Çalışmaların</SectionTitle>
      <HomeGroup>
        <HomeRow icon={featureIcons.history} tone="blue" title={vocabulary.results.title} description="Girdiğin sınavları ve cevaplarını incele" onPress={history} />
        <HomeRow icon={featureIcons.stats} tone="indigo" title={vocabulary.stats.title}
          description={typeof accuracy === "number" ? `Doğruluk %${accuracy.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}` : "İlerlemeni ve derslere göre durumunu gör"}
          accessibilityLabel={`${vocabulary.stats.title} ekranını aç`} onPress={stats} />
      </HomeGroup>
      </View>
      </View>

      <ReadNotice resource={recentExams} refreshOnly />
      <SectionTitle action="Tümünü gör" onPress={history}>Son sınavların</SectionTitle>
      {recentExams.loading && !recentExams.data ? (
        <Loading layout="list" label="Son sınavların yükleniyor" />
      ) : recentExams.error ? (
        <ReadNotice title="Son sınavların yüklenemedi" resource={recentExams} />
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
            return <HomeRow key={attempt.id} icon={attempt.status === "completed" ? featureIcons.history : featureIcons.deneme} title={title}
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

function HomeRow({ icon: Icon, title, description, accessibilityLabel, onPress, badge, tone }: {
  icon: LucideIcon;
  title: string;
  description?: string;
  accessibilityLabel?: string;
  onPress: () => void;
  badge?: ReactNode;
  tone?: CardTone;
}) {
  const { palette } = useTheme();
  const tint = tone ? cardTone(palette, tone) : null;
  return <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? `${title} ekranını aç`} onPress={onPress}
    style={({ pressed }) => ({ minHeight: 66, paddingHorizontal: 14, paddingVertical: cardDensity.paddingY, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: pressed ? (tint?.iconSurface ?? palette.softPrimary) : (tint?.surface ?? palette.surface),
      borderWidth: 1, borderColor: tint?.line ?? palette.line, borderRadius: shape.control })}>
    <View style={{ width: 38, height: 38, borderRadius: shape.control, alignItems: "center", justifyContent: "center", backgroundColor: tint?.iconSurface ?? palette.softPrimary }}>
      <Icon size={21} color={tint?.accent ?? palette.primary} strokeWidth={1.8} />
    </View>
    <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
      <Text style={{ color: palette.ink, fontSize: 15, lineHeight: 22, fontWeight: "600" }}>{title}</Text>
      {description && <Text style={{ color: palette.muted, fontSize: 13, lineHeight: 20 }}>{description}</Text>}
      {badge}
    </View>
    <ChevronRight size={17} color={palette.muted} />
  </Pressable>;
}
