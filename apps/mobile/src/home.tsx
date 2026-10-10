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
  ShieldCheck,
} from "./icons";
import type { StudyContext, User } from "@oggaq/shared-types";
import brand from "../brand.json";
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
  StudyHero,
  palette,
  styles,
} from "./ui";
export function Home({
  user,
  context,
  questions,
  exams,
  history,
  profile,
  practice,
  exam,
}: {
  user: User;
  context: StudyContext;
  questions: (subject?: string) => void;
  exams: () => void;
  history: () => void;
  profile: () => void;
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
      <View style={styles.between}>
        <View style={styles.row}>
          <View
            style={{
              width: 32,
              height: 32,
              backgroundColor: palette.primary,
              borderRadius: 11,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <ShieldCheck size={20} color={palette.white} />
          </View>
          <Text
            style={{
              fontSize: 17,
              fontWeight: "800",
              letterSpacing: 2,
              color: palette.ink,
            }}
          >
            {brand.displayName}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Profilimi aç"
          onPress={profile}
          style={{
            width: 44,
            height: 44,
            borderRadius: 16,
            backgroundColor: palette.softBlue,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text
            style={{ color: palette.primary, fontWeight: "800", fontSize: 16 }}
          >
            {user.name.trim().slice(0, 1).toLocaleUpperCase("tr-TR")}
          </Text>
        </Pressable>
      </View>
      <ScreenTitle
        title={`Merhaba, ${user.name.trim().split(/\s+/)[0]}.`}
        subtitle="Bugün kendine bir adım daha yaklaş."
      />
      <View
        style={{
          backgroundColor: palette.primary,
          padding: 24,
          borderRadius: 26,
          overflow: "hidden",
          gap: 16,
        }}
      >
        <Text
          style={{
            color: "#D7E1FF",
            fontSize: 10,
            fontWeight: "800",
            letterSpacing: 1.5,
          }}
        >
          BUGÜNÜN İLK ADIMI
        </Text>
        <View style={{ position: "absolute", right: -10, top: 32 }}>
          <StudyHero compact />
        </View>
        <Text
          style={{
            color: palette.white,
            fontSize: 28,
            lineHeight: 34,
            fontWeight: "800",
            letterSpacing: -0.7,
            maxWidth: "74%",
          }}
        >
          Bir soru çöz.{"\n"}Bir şey öğren.
        </Text>
        <Text
          style={{
            color: "#DFE7FF",
            fontSize: 12,
            lineHeight: 19,
            maxWidth: "72%",
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
              backgroundColor: palette.mint,
              borderRadius: 13,
              paddingHorizontal: 16,
              minHeight: 46,
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text
            style={{ fontSize: 13, fontWeight: "800", color: palette.navy }}
          >
            Çalışmaya başla
          </Text>
          <ArrowRight size={17} color={palette.navy} />
        </Pressable>
      </View>
      <View style={{ flexDirection: "row", gap: 12 }}>
        {[
          {
            title: "Soru çöz",
            text: "Konunu seç, öğren",
            icon: BookOpen,
            press: () => questions(),
            bg: palette.softBlue,
            color: palette.primary,
          },
          {
            title: "Deneme",
            text: "Kendini sınamak için",
            icon: Clock3,
            press: exams,
            bg: palette.softMint,
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
                borderRadius: 22,
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
                pressed && { backgroundColor: palette.softBlue },
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
                    ? "green"
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
