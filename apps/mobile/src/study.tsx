import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Clock3,
  History as HistoryIcon,
  SlidersHorizontal,
} from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { cursorFromLink } from "@oggaq/api-client";
import type {
  Page,
  PracticeAttempt,
  Question,
  StudyContext,
} from "@oggaq/shared-types";
import { ChoiceGroup } from "./expressive";
import { api } from "./api";
import { useResource, useTask, useOnReturn } from "./hooks";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorNotice,
  Loading,
  styles,
  Badge,
  EmptyState,
  ListRow,
  Option,
  ScreenTitle,
  Sheet,
  palette,
} from "./ui";
export function QuestionList({
  context,
  open,
  initialSubject,
}: {
  context: StudyContext;
  open: (id: string) => void;
  initialSubject?: string;
}) {
  const [cursor, setCursor] = useState<string>();
  const [subject, setSubject] = useState(initialSubject ?? "");
  const [filter, setFilter] = useState<"subject" | "topic" | null>(null);
  const [catalogCursor, setCatalogCursor] = useState<string>();
  const [topic, setTopic] = useState("");
  const [topicCursor, setTopicCursor] = useState<string>();
  const subjects = useResource(
    (signal) =>
      api.request("get", "/api/v1/subjects", {
        signal,
        query: { per_page: 20, cursor: catalogCursor },
      }),
    [catalogCursor],
  );
  const topics = useResource(
    (signal) =>
      api.request("get", "/api/v1/subjects/{subject}/topics", {
        params: { subject },
        signal,
        query: { per_page: 20, cursor: topicCursor },
      }),
    [subject, topicCursor],
    Boolean(subject),
  );
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/questions", {
        signal,
        query: {
          per_page: 10,
          cursor,
          subject_id: subject || undefined,
          topic_id: topic || undefined,
        },
      }),
    [context.id, cursor, subject, topic],
  );
  function chooseSubject(value: string) {
    setSubject(value);
    setTopic("");
    setTopicCursor(undefined);
    setCursor(undefined);
    setFilter(null);
  }
  return (
    <>
      <ScreenTitle
        title="Soru bankası"
        subtitle="Bir konu seç. Soruyu çöz. Açıklamasından öğren."
        eyebrow="HER SORUDA BİR ADIM"
      />
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Ders filtresi"
          onPress={() => setFilter("subject")}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: 9,
            backgroundColor: palette.white,
            padding: 15,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: subject ? palette.primary : palette.line,
          }}
        >
          <SlidersHorizontal size={17} color={palette.primary} />
          <Text
            numberOfLines={1}
            style={{
              flex: 1,
              fontSize: 12,
              fontWeight: "700",
              color: palette.ink,
            }}
          >
            {subjects.data?.data.find((s) => s.id === subject)?.name ??
              (subject ? "Seçili ders" : "Tüm dersler")}
          </Text>
          <ChevronDown size={15} color={palette.muted} />
        </Pressable>
        {subject && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Konu filtresi"
            onPress={() => setFilter("topic")}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: palette.white,
              padding: 15,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: topic ? palette.primary : palette.line,
            }}
          >
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                fontSize: 12,
                fontWeight: "700",
                color: palette.ink,
              }}
            >
              {topics.data?.data.find((t) => t.id === topic)?.name ??
                "Tüm konular"}
            </Text>
            <ChevronDown size={15} color={palette.muted} />
          </Pressable>
        )}
      </View>
      <Sheet
        visible={filter === "subject"}
        title="Hangi dersi çalışalım?"
        close={() => setFilter(null)}
      >
        <Button secondary={Boolean(subject)} onPress={() => chooseSubject("")}>
          Tüm dersler
        </Button>
        {subjects.loading ? (
          <Loading />
        ) : (
          subjects.data?.data.map((s) => (
            <Button
              key={s.id}
              secondary={s.id !== subject}
              onPress={() => chooseSubject(s.id)}
            >
              {s.name}
            </Button>
          ))
        )}
        <ErrorNotice
          error={subjects.error}
          retry={() => {
            void subjects.reload();
          }}
        />
        {subjects.data && (
          <Pagination page={subjects.data} change={setCatalogCursor} />
        )}
      </Sheet>
      <Sheet
        visible={filter === "topic"}
        title="Konunu seç"
        close={() => setFilter(null)}
      >
        <Button
          secondary={Boolean(topic)}
          onPress={() => {
            setTopic("");
            setCursor(undefined);
            setFilter(null);
          }}
        >
          Tüm konular
        </Button>
        {topics.loading ? (
          <Loading />
        ) : (
          topics.data?.data.map((t) => (
            <Button
              key={t.id}
              secondary={t.id !== topic}
              onPress={() => {
                setTopic(t.id);
                setCursor(undefined);
                setFilter(null);
              }}
            >
              {t.name}
            </Button>
          ))
        )}
        <ErrorNotice
          error={topics.error}
          retry={() => {
            void topics.reload();
          }}
        />
        {topics.data && (
          <Pagination
            page={topics.data}
            change={(value) => {
              setTopicCursor(value);
              setTopic("");
              setCursor(undefined);
            }}
          />
        )}
      </Sheet>
      <View style={styles.between}>
        <Text style={styles.heading}>Çözmeye hazır mısın?</Text>
        <Badge>{subject ? "Seçili ders" : "Tüm dersler"}</Badge>
      </View>
      {query.loading ? (
        <Loading />
      ) : query.error ? (
        <ErrorNotice
          error={query.error}
          retry={() => {
            void query.reload();
          }}
        />
      ) : query.data?.data.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Sorular hazırlanıyor"
          message="Bu seçim için henüz yayımlanmış soru yok. İçerik yayımlandığında burada görünecek."
          action={subject ? "Tüm derslere bak" : undefined}
          onPress={subject ? () => chooseSubject("") : undefined}
        />
      ) : (
        query.data?.data.map((q) => (
          <QuestionCard
            key={`${context.id}-${q.id}-${q.version.id}`}
            question={q}
            context={context}
            open={open}
          />
        ))
      )}
      {query.data && <Pagination page={query.data} change={setCursor} />}
    </>
  );
}

function QuestionCard({
  question,
  context,
  open,
}: {
  question: Question;
  context: StudyContext;
  open: (id: string) => void;
}) {
  const id = useRef(Crypto.randomUUID());
  const task = useTask<{ data: PracticeAttempt }>();
  function start() {
    void task.run(
      () =>
        api.request("post", "/api/v1/contexts/{context}/practice-attempts", {
          params: { context: context.id },
          body: {
            id: id.current,
            question_id: question.id,
            question_version_id: question.version.id,
          },
        }),
      (response) => {
        id.current = Crypto.randomUUID();
        open(response.data.id);
      },
    );
  }
  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Soruyu çöz"
        accessibilityState={{ disabled: task.pending }}
        disabled={task.pending}
        onPress={start}
        style={({ pressed }) => [
          {
            backgroundColor: palette.white,
            borderWidth: 1,
            borderColor: palette.line,
            borderRadius: 22,
            padding: 20,
            gap: 14,
          },
          pressed && { backgroundColor: palette.softPrimary },
        ]}
      >
        <View style={styles.between}>
          <View style={styles.row}>
            <BookOpen size={16} color={palette.primary} />
            <Text style={{ color: palette.muted, fontSize: 11 }}>
              Çoktan seçmeli
            </Text>
          </View>
          <ChevronRight size={18} color={palette.primary} />
        </View>
        <Text
          numberOfLines={3}
          style={{
            color: palette.ink,
            fontSize: 16,
            lineHeight: 25,
            fontWeight: "600",
          }}
        >
          {question.version.stem}
        </Text>
        <Text
          style={{ color: palette.primary, fontSize: 12, fontWeight: "700" }}
        >
          {task.pending ? "Açılıyor…" : "Soruyu çöz"}
        </Text>
      </Pressable>
      <ErrorNotice error={task.error} retry={start} />
    </>
  );
}

export function Practice({
  context,
  id,
  back,
}: {
  context: StudyContext;
  id: string;
  back: () => void;
}) {
  const insets = useSafeAreaInsets();
  const query = useResource(
    (signal) =>
      api.request(
        "get",
        "/api/v1/contexts/{context}/practice-attempts/{attempt}",
        { params: { context: context.id, attempt: id }, signal },
      ),
    [context.id, id],
  );
  const task = useTask<{ data: PracticeAttempt }>();
  const [selected, setSelected] = useState<string | null>(null);
  const [submission, setSubmission] = useState<{
    option: string | null;
  } | null>(null);
  const [skip, setSkip] = useState(false);
  const attempt = query.data?.data;
  const done = attempt && attempt.outcome !== "pending";
  function submit(option: string | null) {
    setSubmission({ option });
    void task.run(
      () =>
        api.request(
          "post",
          "/api/v1/contexts/{context}/practice-attempts/{attempt}/answer",
          {
            params: { context: context.id, attempt: id },
            body: { selected_option_id: option },
          },
        ),
      (response) => {
        query.setData(response);
        setSubmission(null);
        setSkip(false);
      },
    );
  }
  if (query.loading) return <Loading />;
  if (query.error || !attempt)
    return (
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.reload();
        }}
      />
    );
  const locked = Boolean(done) || task.pending || submission !== null;
  return (
    <View style={styles.shell}>
      <ConfirmDialog
        visible={skip && !done}
        title="Boş bırak"
        message="Bu soruyu boş olarak tamamlamak istiyor musun?"
        confirm={() => submit(null)}
        cancel={() => setSkip(false)}
        disabled={locked}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.body}
      >
        <View style={styles.between}>
          <Badge>{done ? "ÇÖZÜMÜN" : "ALIŞTIRMA"}</Badge>
          <Text style={styles.muted}>
            {attempt.question.options.length} seçenek
          </Text>
        </View>
        <Card>
          <Text style={[styles.heading, { fontSize: 21, lineHeight: 32 }]}>
            {attempt.question.stem}
          </Text>
          <View accessibilityRole="radiogroup">
            {attempt.question.options.map((o) => {
              const picked = done
                ? attempt.selected_option_id === o.id
                : selected === o.id;
              const correct =
                done && attempt.feedback?.correct_option_id === o.id;
              return (
                <View key={o.id} style={{ marginVertical: 5 }}>
                  <Option
                    label={String.fromCharCode(64 + o.position)}
                    text={o.text}
                    selected={picked}
                    correct={Boolean(correct)}
                    incorrect={Boolean(done && picked && !correct)}
                    disabled={locked}
                    onPress={() => setSelected(o.id)}
                  />
                </View>
              );
            })}
          </View>
          <ErrorNotice
            error={task.error}
            retry={submission ? () => submit(submission.option) : undefined}
          />
          {task.error ? (
            <Button
              secondary
              disabled={task.pending}
              onPress={() => {
                void query.reload().then(() => {
                  setSubmission(null);
                  task.reset();
                });
              }}
            >
              Kaydı yenile
            </Button>
          ) : null}
          {done && (
            <>
              <View
                style={{
                  padding: 18,
                  borderRadius: 18,
                  backgroundColor:
                    attempt.outcome === "correct"
                      ? palette.softSuccess
                      : palette.softRed,
                  gap: 10,
                }}
              >
                <Text
                  style={[
                    styles.heading,
                    {
                      color:
                        attempt.outcome === "correct"
                          ? palette.success
                          : palette.red,
                    },
                  ]}
                >
                  {attempt.outcome === "correct"
                    ? "Doğru"
                    : attempt.outcome === "incorrect"
                      ? "Yanlış"
                      : "Boş bırakıldı"}
                </Text>
                {attempt.feedback?.explanation && (
                  <Text style={[styles.text, { fontSize: 14 }]}>
                    {attempt.feedback.explanation}
                  </Text>
                )}
              </View>
            </>
          )}
          {attempt.question.source && (
            <Text style={styles.muted}>
              Kaynak: {attempt.question.source.title}
            </Text>
          )}
        </Card>
      </ScrollView>
      <View
        style={{
          paddingHorizontal: 24,
          paddingTop: 14,
          paddingBottom: Math.max(insets.bottom, 14),
          backgroundColor: palette.white,
          borderTopWidth: 1,
          borderColor: palette.line,
          gap: 4,
        }}
      >
        {!done ? (
          <>
            <Button
              disabled={locked || !selected}
              onPress={() => submit(selected)}
            >
              {task.pending ? "Kaydediliyor…" : "Cevabımı kontrol et"}
            </Button>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Boş bırak"
              disabled={locked}
              onPress={() => setSkip(true)}
              style={{
                minHeight: 40,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text
                style={{
                  color: palette.muted,
                  fontSize: 12,
                  fontWeight: "600",
                }}
              >
                Boş bırak
              </Text>
            </Pressable>
          </>
        ) : (
          <Button onPress={back}>Çalışmaya devam et</Button>
        )}
      </View>
    </View>
  );
}
export function History({
  context,
  open,
  openExam,
}: {
  context: StudyContext;
  open: (id: string) => void;
  openExam: (id: string) => void;
}) {
  const [mode, setMode] = useState<"practice" | "exam">("practice");
  const [cursor, setCursor] = useState<string>();
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/practice-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 10 },
        signal,
      }),
    [context.id, cursor, mode],
    mode === "practice",
  );
  const exams = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 10 },
        signal,
      }),
    [context.id, cursor, mode],
    mode === "exam",
  );
  useOnReturn(() => {
    if (mode === "practice") void query.reload();
    else void exams.reload();
  });
  const current = mode === "practice" ? query : exams;
  return (
    <>
      <ScreenTitle
        title="Geçmişim"
        subtitle="Her çalışman, bir sonraki adımın için burada."
      />
      <ChoiceGroup
        choices={[
          {
            value: "practice",
            label: "Sorular",
            accessibilityLabel: "Soru geçmişi",
          },
          {
            value: "exam",
            label: "Denemeler",
            accessibilityLabel: "Deneme geçmişi",
          },
        ]}
        value={mode}
        onChange={(value) => {
          setMode(value);
          setCursor(undefined);
        }}
      />
      {current.loading ? (
        <Loading />
      ) : current.error ? (
        <ErrorNotice
          error={current.error}
          retry={() => {
            void current.reload();
          }}
        />
      ) : current.data?.data.length === 0 ? (
        <EmptyState
          icon={HistoryIcon}
          title="Yeni bir başlangıç"
          message={
            mode === "practice"
              ? "Soru çözdüğünde sonuçların burada görünür."
              : "Tamamladığın ve devam eden denemelerin burada görünür."
          }
        />
      ) : mode === "practice" ? (
        query.data?.data.map((a) => (
          <ListRow
            key={a.id}
            title={a.question.stem}
            subtitle={new Date(a.created_at).toLocaleDateString("tr-TR")}
            onPress={() => open(a.id)}
            label={a.outcome === "pending" ? "Çalışmaya dön" : "Sonucu incele"}
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
      ) : (
        exams.data?.data.map((e) => (
          <ListRow
            key={e.id}
            icon={Clock3}
            title={`${e.question_count} soruluk deneme`}
            subtitle={new Date(e.started_at).toLocaleDateString("tr-TR")}
            label={e.status === "active" ? "Denemeye dön" : "Sonucu incele"}
            onPress={() => openExam(e.id)}
            badge={
              <Badge tone={e.status === "completed" ? "success" : "primary"}>
                {e.status === "active"
                  ? "Devam ediyor"
                  : e.result
                    ? `%${e.result.score_percent} doğru`
                    : "Sonuç bekleniyor"}
              </Badge>
            }
          />
        ))
      )}
      {current.data && <Pagination page={current.data} change={setCursor} />}
    </>
  );
}

export function Pagination({
  page,
  change,
}: {
  page: Page<unknown>;
  change: (cursor: string | undefined) => void;
}) {
  if (!page.links.prev && !page.links.next) return null;
  return (
    <View style={styles.row}>
      <Button
        secondary
        disabled={!page.links.prev}
        onPress={() => change(cursorFromLink(page.links.prev))}
      >
        Önceki sayfa
      </Button>
      <Button
        secondary
        disabled={!page.links.next}
        onPress={() => change(cursorFromLink(page.links.next))}
      >
        Sonraki sayfa
      </Button>
    </View>
  );
}
