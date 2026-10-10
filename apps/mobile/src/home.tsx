import { Pressable, Text, View } from "react-native";
import {
  ArrowRight,
  BookOpen,
  ChevronRight,
  Clock3,
  GraduationCap,
  History,
  Layers3,
  Play,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import { Enter, ExpressiveEmblem, ExpressivePressable } from "./expressive";
import { shape, typography } from "./theme";
import { api } from "./api";
import { useResource, useOnReturn } from "./hooks";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNotice,
  ListRow,
  Loading,
  ScreenTitle,
  SectionTitle,
  palette,
  styles,
} from "./ui";
export function Home({
  user,
  context,
  questions,
  exams,
  history,
  practice,
  exam,
}: {
  user: User;
  context: StudyContext;
  questions: (subject?: string) => void;
  exams: () => void;
  history: () => void;
  practice: (id: string) => void;
  exam: (id: string) => void;
}) {
  const subjects = useResource(
    (signal) =>
      api.request("get", "/api/v1/subjects", {
        signal,
        query: { per_page: 4 },
      }),
    [],
  );
  const recent = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/practice-attempts", {
        signal,
        params: { context: context.id },
        query: { per_page: 3 },
      }),
    [context.id],
  );
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
    void recent.reload();
    void recentExams.reload();
  });
  const activeExam = recentExams.data?.data.find((e) => e.status === "active");
  return (
    <>
      <ScreenTitle
        title={`Merhaba, ${user.name.trim().split(/\s+/)[0]}.`}
        subtitle="Bugün kendine bir adım daha yaklaş."
      />
      <Enter
        style={{
          backgroundColor: palette.navy,
          padding: 22,
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
            BUGÜNÜN İLK ADIMI
          </Text>
          <ExpressiveEmblem size={48} color={palette.accent}>
            <BookOpen size={22} color={palette.navy} strokeWidth={1.8} />
          </ExpressiveEmblem>
        </View>
        <Text
          style={{
            color: palette.white,
            ...typography.display,
          }}
        >
          Hazırlan.{"\n"}Bir adım ilerle.
        </Text>
        <Text
          style={{
            color: palette.onNavyMuted,
            fontSize: 12,
            lineHeight: 19,
          }}
        >
          Küçük adımlar, daha güçlü bir hazırlık.
        </Text>
        <View style={{ alignSelf: "flex-start" }}>
          <Button secondary icon={ArrowRight} onPress={() => questions()}>
            Çalışmaya başla
          </Button>
        </View>
      </Enter>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          {
            title: "Soru çöz",
            text: "Konunu seç, öğren",
            icon: BookOpen,
            press: () => questions(),
            bg: palette.primaryContainer,
            color: palette.onPrimaryContainer,
          },
          {
            title: "Deneme",
            text: "Kendini sınamak için",
            icon: Clock3,
            press: exams,
            bg: palette.secondaryContainer,
            color: palette.onSecondaryContainer,
          },
        ].map(({ title, text, icon: Icon, press, bg, color }) => (
          <ExpressivePressable
            key={title}
            radius={title === "Soru çöz" ? shape.large : shape.extraLarge}
            accessibilityRole="button"
            accessibilityLabel={title + " ekranını aç"}
            onPress={press}
            style={{
              flex: 1,
              backgroundColor: bg,
              borderRadius: shape.large,
              padding: 18,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 42,
                height: 42,
                backgroundColor: palette.white,
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
      <SectionTitle action="Tüm dersler" onPress={() => questions()}>
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
              onPress={() => questions(s.id)}
              style={({ pressed }) => [
                {
                  width: "47.8%",
                  flexGrow: 1,
                  backgroundColor: palette.white,
                  borderRadius: 20,
                  padding: 17,
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
        Son çalışmaların
      </SectionTitle>
      {recent.loading ? (
        <Loading />
      ) : recent.error ? (
        <ErrorNotice
          error={recent.error}
          retry={() => {
            void recent.reload();
          }}
        />
      ) : recent.data?.data.length === 0 ? (
        <EmptyState
          icon={History}
          title="İlk adımın burada"
          message="Çözdüğün sorular ve öğrendiklerin burada birikir. Bir soruyla başlayabilirsin."
          action="Soru çözmeye başla"
          onPress={() => questions()}
        />
      ) : (
        recent.data?.data.map((a) => (
          <ListRow
            key={a.id}
            title={a.question.stem}
            subtitle={new Date(a.created_at).toLocaleDateString("tr-TR")}
            onPress={() => practice(a.id)}
            badge={
              <Badge
                tone={
                  a.outcome === "correct"
                    ? "success"
                    : a.outcome === "incorrect"
                      ? "red"
                      : "neutral"
                }
              >
                {a.outcome === "pending"
                  ? "Devam ediyor"
                  : a.outcome === "correct"
                    ? "Doğru"
                    : a.outcome === "incorrect"
                      ? "Yanlış"
                      : "Boş bırakıldı"}
              </Badge>
            }
          />
        ))
      )}
      <Text style={[styles.muted, { textAlign: "center", fontSize: 11 }]}>
        {context.kind === "personal" ? "Kişisel çalışma alanın" : context.name}
      </Text>
    </>
  );
}
