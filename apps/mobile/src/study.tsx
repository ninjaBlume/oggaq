import { useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { BookOpen, ChevronRight } from "./icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Crypto from "expo-crypto";
import { cursorFromLink } from "@oggaq/api-client";
import { examLabel, examSummary } from "@oggaq/study-core";
import type {
  Page,
  PracticeAttempt,
  Question,
  StudyContext,
} from "@oggaq/shared-types";
import { api } from "./api";
import { useResource, useTask } from "./hooks";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorNotice,
  Loading,
  styles,
  Badge,
  Option,
  TextLink,
  palette,
} from "./ui";
export function QuestionCard({
  question,
  context,
  open,
  subjectName,
}: {
  question: Question;
  context: StudyContext;
  open: (id: string) => void;
  subjectName?: string;
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
              {`Ders: ${subjectName ?? "—"}`}
            </Text>
          </View>
          <ChevronRight size={18} color={palette.primary} />
        </View>
        <Text style={{ color: palette.muted, fontSize: 11, lineHeight: 16 }}>
          {`Sınav: ${examSummary(question.exams)}`}
        </Text>
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
  const subjects = useResource(
    (signal) =>
      api.request("get", "/api/v1/subjects", {
        signal,
        query: { per_page: 100 },
      }),
    [],
  );
  const favorite = useTask<{ data: { favorite: boolean } }>();
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
  function toggleFavorite(next: boolean) {
    void favorite.run(
      () =>
        next
          ? api.request("put", "/api/v1/contexts/{context}/favorites/{question}", {
              params: { context: context.id, question: attempt!.question_id },
            })
          : api.request(
              "delete",
              "/api/v1/contexts/{context}/favorites/{question}",
              { params: { context: context.id, question: attempt!.question_id } },
            ),
      (response) => {
        query.setData((current) =>
          current
            ? { data: { ...current.data, is_favorite: response.data.favorite } }
            : current,
        );
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
          <Text style={styles.muted}>
            {`Ders: ${subjects.data?.data.find((s) => s.id === attempt.question.subject_id)?.name ?? "—"}`}
          </Text>
          <Text style={styles.muted}>
            {attempt.exams.length === 0
              ? "Sınav: çıkmış sınavlarda yok"
              : `Sınav: ${attempt.exams.map(examLabel).join(", ")}`}
          </Text>
          <TextLink onPress={() => toggleFavorite(!attempt.is_favorite)}>
            {favorite.pending
              ? "Kaydediliyor…"
              : attempt.is_favorite
                ? "★ Favorilerde"
                : "☆ Favoriye ekle"}
          </TextLink>
          <ErrorNotice error={favorite.error} />
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
