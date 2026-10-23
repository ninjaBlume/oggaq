import { Pressable, Text, View } from "react-native";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  ChevronRight,
  Clock3,
  GraduationCap,
  History,
  ListChecks,
  Play,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { Enter, ExpressivePressable } from "./expressive";
import { vocabulary } from "@oggaq/study-core";
import { scoreTone, shape } from "./theme";
import { api } from "./api";
import { useResource, useOnReturn } from "./hooks";
import {
  Badge,
  Button,
  Columns,
  EmptyState,
  ErrorNotice,
  ListRow,
  Loading,
  ScreenTitle,
  SectionTitle,
  TextLink,
} from "./ui";
import { useLayout, useTheme } from "./themeContext";
import brand from "../brand.json";
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
  const subjects = useResource(
    (signal) =>
      api.request("get", "/api/v1/subjects", {
        signal,
        query: { per_page: 4 },
      }),
    [],
  );
  // Quiet shortcut data: a failed request only hides the accuracy hint.
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
  const quick = [
    {
      title: vocabulary.review.title,
      text: "Hatalarından sınav yap",
      icon: ListChecks,
      press: review,
      bg: palette.secondaryContainer,
      color: palette.onSecondaryContainer,
    },
    {
      title: vocabulary.stats.title,
      text:
        typeof accuracy === "number"
          ? `Doğruluk %${accuracy.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`
          : "İlerlemeni gör",
      icon: ChartColumn,
      press: stats,
      bg: palette.primaryContainer,
      color: palette.onPrimaryContainer,
    },
  ];
  return (
    <>
      <ScreenTitle
        title={`Merhaba, ${user.name.trim().split(/\s+/)[0]}.`}
        subtitle="Bir sınav seç, kaldığın yerden devam et."
      />
      {recentExams.loading && !recentExams.data ? (
        <Loading layout="list" count={1} label="Devam eden sınavların yükleniyor" />
      ) : activeExam ? (
        <Enter style={{ backgroundColor: palette.surface, borderRadius: shape.large, padding: layout.cardPadding, gap: 12, borderWidth: 1, borderColor: palette.primary }}>
          <Badge>Devam ediyor</Badge>
          <Text accessibilityRole="header" style={styles.heading}>Kaldığın yerden devam et</Text>
          <Text style={styles.text}>{activeExam.official_exam?.title ?? `${activeExam.question_count} soruluk deneme`}</Text>
          <Text style={styles.muted}>{activeExam.question_count} soru · Süren işlemeye devam ediyor</Text>
          <Button icon={Play} onPress={() => exam(activeExam.id)}>Denemene devam et</Button>
          <TextLink onPress={deneme}>Diğer sınavları gör</TextLink>
        </Enter>
      ) : (
        <Enter style={{ backgroundColor: palette.navy, padding: layout.cardPadding, borderRadius: shape.large, gap: 12 }}>
          <Text accessibilityRole="header" style={[styles.heading, { color: palette.onNavy }]}>{brand.tagline}.</Text>
          <Text style={[styles.muted, { color: palette.onNavyMuted }]}>Deneme veya ders sınavı seç, sonuçlarını incele.</Text>
          <View style={{ alignSelf: "flex-start" }}>
            <Button secondary icon={ArrowRight} onPress={deneme}>Sınava gir</Button>
          </View>
        </Enter>
      )}
      <View style={{ flexDirection: "row", gap: 12 }}>
          {quick.map(({ title, text, icon: Icon, press, bg, color }) => (
            <ExpressivePressable
              key={title}
              radius={shape.large}
              accessibilityRole="button"
              accessibilityLabel={title + " ekranını aç"}
              onPress={press}
              style={{
                flex: 1,
                backgroundColor: bg,
                borderRadius: shape.large,
                padding: layout.cardPadding,
                gap: 8,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: palette.surface,
                  borderRadius: shape.medium,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 0,
                }}
              >
                <Icon size={21} color={color} strokeWidth={1.8} />
              </View>
              <Text style={{ color, fontSize: 17, fontWeight: "700" }}>
                {title}
              </Text>
              <Text style={{ fontSize: 14, color, lineHeight: 21 }}>{text}</Text>
            </ExpressivePressable>
          ))}
      </View>
      <SectionTitle action="Tüm dersler" onPress={() => ders()}>
        Derslerini keşfet
      </SectionTitle>
      {subjects.loading ? (
        <Loading layout="tiles" label="Dersler yükleniyor" />
      ) : subjects.error ? (
        <ErrorNotice
          title="Dersler yüklenemedi"
          error={subjects.error}
          retry={() => {
            void subjects.reload();
          }}
        />
      ) : subjects.data?.data.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Dersler hazırlanıyor"
          message="Dersler yayımlandığında buradan kolayca ulaşabilirsin."
        />
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
          {subjects.data?.data.map((s) => (
            <Pressable
              key={s.id}
              accessibilityRole="button"
              accessibilityLabel={`${s.name} dersini aç`}
              onPress={() => ders(s.id)}
              style={({ pressed }) => [
                {
                  width: layout.columns === 2 ? "23.7%" : "47.8%",
                  flexGrow: 1,
                  backgroundColor: palette.surface,
                  borderRadius: shape.large,
                  padding: 14,
                  gap: 14,
                  borderWidth: 1,
                  borderColor: palette.line,
                },
                pressed && { backgroundColor: palette.softPrimary },
              ]}
            >
              <View style={styles.between}>
                <BookOpen size={22} color={palette.primary} />
                <ChevronRight size={15} color={palette.muted} />
              </View>
              <Text
                numberOfLines={3}
                style={{
                  fontSize: 14,
                  lineHeight: 21,
                  fontWeight: "700",
                  color: palette.ink,
                }}
              >
                {s.name}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
      <SectionTitle action="Tümünü gör" onPress={history}>
        Son sınavların
      </SectionTitle>
      {recentExams.loading ? (
        <Loading layout="list" label="Son sınavların yükleniyor" />
      ) : recentExams.error ? (
        <ErrorNotice title="Son sınavların yüklenemedi" error={recentExams.error} retry={() => void recentExams.reload()} />
      ) : recentExams.data?.data.length === 0 ? (
        <EmptyState
          icon={History}
          title="İlk sınavın burada"
          message="Girdiğin deneme ve ders sınavları burada birikir. Bir deneme sınavıyla başlayabilirsin."
          action="Deneme sınavlarına git"
          onPress={deneme}
        />
      ) : (
        <Columns>
          {recentExams.data?.data.map((e) => (
          <ListRow
            key={e.id}
            icon={Clock3}
            title={e.official_exam?.title ?? `${e.question_count} soruluk deneme`}
            subtitle={new Date(e.started_at).toLocaleDateString("tr-TR")}
            onPress={() => exam(e.id)}
            badge={
              <Badge tone={e.status === "completed" && e.result ? scoreTone(e.result.score_percent, palette).badge : "primary"}>
                {e.status === "active"
                  ? Date.parse(e.deadline_at) > Date.parse(e.server_time) ? "Devam ediyor" : "Süresi doldu"
                  : e.result
                    ? `%${e.result.score_percent} doğru`
                    : "Sonuç bekleniyor"}
              </Badge>
            }
          />
        ))}
        </Columns>
      )}
      <Text style={[styles.muted, { textAlign: "center", fontSize: 13 }]}>
        {context.kind === "personal" ? "Kişisel çalışma alanın" : context.name}
      </Text>
    </>
  );
}
