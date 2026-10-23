import { Pressable, Text, View } from "react-native";
import {
  ArrowRight,
  BookOpen,
  ChartColumn,
  ChevronRight,
  Clock3,
  GraduationCap,
  History,
  Layers3,
  ListChecks,
  Play,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { Enter, ExpressiveEmblem, ExpressivePressable } from "./expressive";
import { vocabulary } from "@oggaq/study-core";
import { scoreTone, shape, typography } from "./theme";
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
      title: vocabulary.deneme.title,
      text: "Tam sınav, gerçek süre",
      icon: Clock3,
      press: deneme,
      bg: palette.primaryContainer,
      color: palette.onPrimaryContainer,
    },
    {
      title: vocabulary.ders.title,
      text: "Ders ders çalış",
      icon: BookOpen,
      press: () => ders(),
      bg: palette.secondaryContainer,
      color: palette.onSecondaryContainer,
    },
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
  // Two quick actions per row on a phone, all four on an expanded window.
  const perRow = layout.columns === 2 ? 4 : 2;
  const tiles = [quick.slice(0, perRow), ...(perRow === 2 ? [quick.slice(2)] : [])];
  return (
    <>
      <ScreenTitle
        title={`Merhaba, ${user.name.trim().split(/\s+/)[0]}.`}
        subtitle="Bir sınav seç, kaldığın yerden devam et."
      />
      <Enter
        style={{
          backgroundColor: palette.navy,
          padding: 16,
          borderRadius: shape.extraLarge,
          borderTopRightRadius: shape.medium,
          overflow: "hidden",
          gap: 16,
        }}
      >
        <View style={styles.between}>
          <Text
            style={{
              color: palette.accent,
              fontSize: 10,
              fontWeight: "800",
              letterSpacing: 1.5,
            }}
          >
            {brand.subtitle.toLocaleUpperCase("tr-TR")}
          </Text>
          <ExpressiveEmblem size={48} color={palette.accent}>
            <BookOpen size={22} color={palette.navy} strokeWidth={1.8} />
          </ExpressiveEmblem>
        </View>
        <Text
          style={{
            color: palette.onNavy,
            ...typography.display,
          }}
        >
          Özel güvenlik{"\n"}sınavlarına hazırlan.
        </Text>
        <Text
          style={{
            color: palette.onNavyMuted,
            fontSize: 12,
            lineHeight: 19,
          }}
        >
          Deneme ve ders sınavlarını gerçek süreyle çöz, eksiklerini gör, tekrar et.
        </Text>
        <View style={{ alignSelf: "flex-start" }}>
          <Button secondary icon={ArrowRight} onPress={deneme}>
            Sınava gir
          </Button>
        </View>
      </Enter>
      {tiles.map((row) => (
        <View key={row[0]!.title} style={{ flexDirection: "row", gap: 12 }}>
          {row.map(({ title, text, icon: Icon, press, bg, color }) => (
            <ExpressivePressable
              key={title}
              radius={title === vocabulary.deneme.title ? shape.large : shape.extraLarge}
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
                  width: 42,
                  height: 42,
                  backgroundColor: palette.surface,
                  borderRadius: shape.full,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 6,
                }}
              >
                <Icon size={21} color={color} strokeWidth={1.8} />
              </View>
              <Text style={{ color, fontSize: 17, fontWeight: "700" }}>
                {title}
              </Text>
              <Text style={{ fontSize: 12, color, lineHeight: 18 }}>{text}</Text>
            </ExpressivePressable>
          ))}
        </View>
      ))}
      {recentExams.error && (
        <ErrorNotice
          error={recentExams.error}
          retry={() => {
            void recentExams.reload();
          }}
        />
      )}
      {activeExam && (
        <ListRow
          icon={Play}
          title="Denemene devam et"
          subtitle={`${activeExam.question_count} soru · Süre devam ediyor`}
          onPress={() => exam(activeExam.id)}
          badge={<Badge>Devam ediyor</Badge>}
        />
      )}
      <SectionTitle action="Tüm dersler" onPress={() => ders()}>
        Derslerini keşfet
      </SectionTitle>
      {subjects.loading ? (
        <Loading />
      ) : subjects.error ? (
        <ErrorNotice
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
          {subjects.data?.data.map((s, index) => (
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
                  borderRadius: 20,
                  padding: 14,
                  gap: 14,
                  borderWidth: 1,
                  borderColor: palette.line,
                },
                pressed && { backgroundColor: palette.softPrimary },
              ]}
            >
              <View style={styles.between}>
                {index % 2 === 0 ? (
                  <BookOpen size={22} color={palette.primary} />
                ) : (
                  <Layers3 size={22} color={palette.success} />
                )}
                <ChevronRight size={15} color={palette.muted} />
              </View>
              <Text
                numberOfLines={2}
                style={{
                  fontSize: 13,
                  lineHeight: 20,
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
        <Loading />
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
      <Text style={[styles.muted, { textAlign: "center", fontSize: 11 }]}>
        {context.kind === "personal" ? "Kişisel çalışma alanın" : context.name}
      </Text>
    </>
  );
}
