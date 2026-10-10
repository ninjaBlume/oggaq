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
import { api } from "./api";
import { useResource, useOnReturn } from "./hooks";
import {
  Badge,
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
      <View
        style={{
          backgroundColor: palette.navy,
          padding: 22,
          borderRadius: 20,
          overflow: "hidden",
          gap: 16,
        }}
      >
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
        <Text
          style={{
            color: palette.white,
            fontSize: 25,
            lineHeight: 32,
            fontWeight: "800",
            letterSpacing: -0.7,
          }}
        >
          Sınava adım adım hazırlan.
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Çalışmaya başla"
          onPress={() => questions()}
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignSelf: "flex-start",
              alignItems: "center",
              gap: 12,
              backgroundColor: palette.primary,
              borderRadius: 14,
              paddingHorizontal: 16,
              minHeight: 50,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "700", color: palette.white }}
          >
            Çalışmaya başla
          </Text>
          <ArrowRight size={17} color={palette.white} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          {
            title: "Soru çöz",
            text: "Konunu seç, öğren",
            icon: BookOpen,
            press: () => questions(),
            bg: palette.softPrimary,
            color: palette.primary,
          },
          {
            title: "Deneme",
            text: "Kendini sınamak için",
            icon: Clock3,
            press: exams,
            bg: palette.softSuccess,
            color: palette.success,
          },
        ].map(({ title, text, icon: Icon, press, bg, color }) => (
          <Pressable
            key={title}
            accessibilityRole="button"
            accessibilityLabel={title + " ekranını aç"}
            onPress={press}
            style={({ pressed }) => [
              {
                flex: 1,
                backgroundColor: palette.white,
                borderRadius: 18,
                padding: 18,
                gap: 8,
                borderWidth: 1,
                borderColor: palette.line,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <View
              style={{
                width: 42,
                height: 42,
                backgroundColor: bg,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 6,
              }}
            >
              <Icon size={21} color={color} strokeWidth={1.8} />
            </View>
            <Text
              style={{ color: palette.ink, fontSize: 16, fontWeight: "700" }}
            >
              {title}
            </Text>
            <Text
              style={{ fontSize: 11, color: palette.muted, lineHeight: 17 }}
            >
              {text}
            </Text>
          </Pressable>
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
