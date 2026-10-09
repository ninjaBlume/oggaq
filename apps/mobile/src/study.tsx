import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import { cursorFromLink } from "@oggaq/api-client";
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
  Heading,
  Loading,
  styles,
} from "./ui";
export function QuestionList({
  context,
  open,
}: {
  context: StudyContext;
  open: (id: string) => void;
}) {
  const [cursor, setCursor] = useState<string>();
  const [subject, setSubject] = useState("");
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
  return (
    <>
      <Heading>Bugün ne çalışalım?</Heading>
      <Text style={styles.muted}>
        {context.name} · Bir soru aç, cevapla ve açıklamasından öğren.
      </Text>
      <Card>
        <Text style={styles.heading}>Ders seç</Text>
        <View style={styles.row}>
          <Button
            secondary
            onPress={() => {
              setSubject("");
              setTopic("");
              setTopicCursor(undefined);
              setCursor(undefined);
            }}
          >
            Tüm dersler
          </Button>
          {subjects.data?.data.map((s) => (
            <Button
              key={s.id}
              secondary={s.id !== subject}
              onPress={() => {
                setSubject(s.id);
                setTopic("");
                setTopicCursor(undefined);
                setCursor(undefined);
              }}
            >
              {s.name}
            </Button>
          ))}
        </View>
        <ErrorNotice
          error={subjects.error}
          retry={() => {
            void subjects.reload();
          }}
        />
        {subjects.data && (
          <Pagination page={subjects.data} change={setCatalogCursor} />
        )}
      </Card>
      {subject && (
        <Card>
          <Text style={styles.heading}>Konu seç</Text>
          <View style={styles.row}>
            <Button
              secondary
              onPress={() => {
                setTopic("");
                setCursor(undefined);
              }}
            >
              Tüm konular
            </Button>
            {topics.data?.data.map((t) => (
              <Button
                key={t.id}
                secondary={topic !== t.id}
                onPress={() => {
                  setTopic(t.id);
                  setCursor(undefined);
                }}
              >
                {t.name}
              </Button>
            ))}
          </View>
          <ErrorNotice
            error={topics.error}
            retry={() => {
              void topics.reload();
            }}
          />
          {topics.data && (
            <Pagination
              page={topics.data}
              change={(cursor) => {
                setTopicCursor(cursor);
                setTopic("");
                setCursor(undefined);
              }}
            />
          )}
        </Card>
      )}
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
        <Card>
          <Text style={styles.heading}>Henüz yayımlanmış soru yok</Text>
          <Text style={styles.text}>
            Bu ders için içerik yayımlandığında burada görünecek.
          </Text>
        </Card>
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
      (response) => open(response.data.id),
    );
  }
  return (
    <Card>
      <Text style={styles.heading}>{question.version.stem}</Text>
      <Text style={styles.muted}>
        Sürüm {question.version.version} · {question.version.options.length}{" "}
        seçenek
      </Text>
      <Button disabled={task.pending} onPress={start}>
        {task.pending ? "Açılıyor…" : "Soruyu çöz"}
      </Button>
      <ErrorNotice error={task.error} retry={start} />
    </Card>
  );
}
export function Practice({
  context,
  id,
}: {
  context: StudyContext;
  id: string;
}) {
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
    <>
      <ConfirmDialog
        visible={skip && !done}
        title="Boş bırak"
        message="Bu soruyu boş olarak tamamlamak istiyor musun?"
        confirm={() => submit(null)}
        cancel={() => setSkip(false)}
        disabled={locked}
      />
      <Heading>{done ? "Çözümünü incele" : "Bir soru, bir adım"}</Heading>
      <Card>
        <Text style={styles.heading}>{attempt.question.stem}</Text>
        <View accessibilityRole="radiogroup">
          {attempt.question.options.map((o) => {
            const picked = done
              ? attempt.selected_option_id === o.id
              : selected === o.id;
            const correct =
              done && attempt.feedback?.correct_option_id === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityLabel={o.text}
                accessibilityState={{ checked: picked, disabled: locked }}
                disabled={locked}
                onPress={() => setSelected(o.id)}
                style={[
                  styles.option,
                  picked && styles.selected,
                  correct && styles.correct,
                  { marginVertical: 5 },
                ]}
              >
                <Text style={styles.text}>
                  {String.fromCharCode(64 + o.position)}
                </Text>
                <Text style={[styles.text, { flex: 1 }]}>
                  {o.text}
                  {correct ? " · Doğru cevap" : ""}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!done && (
          <>
            <Button
              disabled={locked || !selected}
              onPress={() => submit(selected)}
            >
              {task.pending ? "Kaydediliyor…" : "Cevabımı kontrol et"}
            </Button>
            <Button secondary disabled={locked} onPress={() => setSkip(true)}>
              Boş bırak
            </Button>
          </>
        )}
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
            <Text style={styles.heading}>
              {attempt.outcome === "correct"
                ? "Doğru"
                : attempt.outcome === "incorrect"
                  ? "Yanlış"
                  : "Boş bırakıldı"}
            </Text>
            {attempt.feedback?.explanation && (
              <Text style={styles.text}>{attempt.feedback.explanation}</Text>
            )}
          </>
        )}
        {attempt.question.source && (
          <Text style={styles.muted}>
            Kaynak: {attempt.question.source.title}
          </Text>
        )}
      </Card>
    </>
  );
}
export function History({
  context,
  open,
}: {
  context: StudyContext;
  open: (id: string) => void;
}) {
  const [cursor, setCursor] = useState<string>();
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/practice-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 10 },
        signal,
      }),
    [context.id, cursor],
  );
  return (
    <>
      <Heading>Çalışma geçmişim</Heading>
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
        <Card>
          <Text style={styles.text}>
            Henüz çalışman yok. Soru çözerek başlayabilirsin.
          </Text>
        </Card>
      ) : (
        query.data?.data.map((a) => (
          <Card key={a.id}>
            <Text style={styles.heading}>{a.question.stem}</Text>
            <Text style={styles.muted}>
              {a.outcome === "pending"
                ? "Devam ediyor"
                : a.outcome === "correct"
                  ? "Doğru"
                  : a.outcome === "incorrect"
                    ? "Yanlış"
                    : "Boş bırakıldı"}{" "}
              · {new Date(a.created_at).toLocaleDateString("tr-TR")}
            </Text>
            <Button secondary onPress={() => open(a.id)}>
              {a.outcome === "pending" ? "Çalışmaya dön" : "Sonucu incele"}
            </Button>
          </Card>
        ))
      )}
      {query.data && <Pagination page={query.data} change={setCursor} />}
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
