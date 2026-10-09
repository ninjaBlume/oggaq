import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import * as Crypto from "expo-crypto";
import type {
  ExamAttempt,
  StudyContext,
  components,
} from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import { anchorClock, remainingSeconds, timeLabel } from "@oggaq/study-core";
import { api } from "./api";
import { useResource, useResume, useTask } from "./hooks";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorNotice,
  Field,
  Heading,
  Loading,
  styles,
} from "./ui";
import { Pagination } from "./study";
type StartInput = components["schemas"]["StartExamInput"];
export function Exams({
  context,
  open,
}: {
  context: StudyContext;
  open: (id: string) => void;
}) {
  const [count, setCount] = useState("10");
  const [minutes, setMinutes] = useState("15");
  const [cursor, setCursor] = useState<string>();
  const submission = useRef<StartInput | null>(null);
  const task = useTask<{ data: ExamAttempt }>();
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 10 },
        signal,
      }),
    [context.id, cursor],
  );
  function begin() {
    submission.current ??= {
      id: Crypto.randomUUID(),
      question_count: Number(count),
      duration_seconds: Number(minutes) * 60,
    };
    void task.run(
      () =>
        api.request("post", "/api/v1/contexts/{context}/exam-attempts", {
          params: { context: context.id },
          body: submission.current!,
        }),
      (r) => open(r.data.id),
    );
  }
  useEffect(() => {
    if (
      task.error instanceof ApiError &&
      [409, 422].includes(task.error.status)
    )
      submission.current = null;
  }, [task.error]);
  const locked =
    task.pending ||
    (submission.current !== null &&
      !(
        task.error instanceof ApiError && [409, 422].includes(task.error.status)
      ));
  return (
    <>
      <Heading>Deneme sınavı</Heading>
      <Card>
        <Field
          label="Soru sayısı"
          numeric
          value={count}
          onChange={setCount}
          editable={!locked}
        />
        <Field
          label="Süre (dakika)"
          numeric
          value={minutes}
          onChange={setMinutes}
          editable={!locked}
        />
        <Text style={styles.muted}>
          1–100 soru, 1–120 dakika. Süre uygulamadan ayrılsan da işler. Puanın
          doğru yüzdesidir; resmî sınav şablonu değildir.
        </Text>
        <Button disabled={locked || !count || !minutes} onPress={begin}>
          {task.pending ? "Hazırlanıyor…" : "Denemeyi başlat"}
        </Button>
        <ErrorNotice error={task.error} retry={begin} />
      </Card>
      <Text style={styles.heading}>Deneme geçmişim</Text>
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
          <Text style={styles.text}>Henüz denemen yok.</Text>
        </Card>
      ) : (
        query.data?.data.map((e) => (
          <Card key={e.id}>
            <Text style={styles.heading}>
              {e.question_count} soruluk deneme
            </Text>
            <Text style={styles.muted}>
              {e.status === "active"
                ? "Devam ediyor"
                : `Doğru yüzdesi: %${e.result?.score_percent}`}{" "}
              · {new Date(e.started_at).toLocaleDateString("tr-TR")}
            </Text>
            <Button secondary onPress={() => open(e.id)}>
              {e.status === "active" ? "Denemeye dön" : "Sonucu incele"}
            </Button>
          </Card>
        ))
      )}
      {query.data && <Pagination page={query.data} change={setCursor} />}
    </>
  );
}
type Save = { row: string; option: string | null; revision: number };
export function Exam({
  context,
  id,
  onComplete,
}: {
  context: StudyContext;
  id: string;
  onComplete: () => void;
}) {
  const latest = useRef<ExamAttempt | null>(null);
  const query = useResource(
    async (signal) => {
      const response = await api.request(
        "get",
        "/api/v1/contexts/{context}/exam-attempts/{exam}",
        { params: { context: context.id, exam: id }, signal },
      );
      if (latest.current && latest.current.revision > response.data.revision)
        return { data: latest.current };
      latest.current = response.data;
      return response;
    },
    [context.id, id],
  );
  const task = useTask<{ data: ExamAttempt }>();
  const [index, setIndex] = useState(0);
  const [submission, setSubmission] = useState<Save | null>(null);
  const [finishing, setFinishing] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const exam = query.data?.data;
  const done = exam?.status === "completed";
  useEffect(() => {
    if (done) {
      onComplete();
      setSubmission(null);
      setFinishing(null);
      task.reset();
    }
  }, [done]);
  useResume(() => {
    void query.reload();
  });
  useEffect(() => {
    if (!exam || done) return;
    const timer = setInterval(() => {
      void query.reload();
    }, 15000);
    return () => clearInterval(timer);
  }, [done, exam?.id]);
  useEffect(() => {
    if (!exam) return;
    const clock = anchorClock(
      exam.deadline_at,
      exam.server_time,
      performance.now(),
    );
    let asked = false;
    const tick = () => {
      const left = remainingSeconds(clock, performance.now());
      setSeconds(left);
      if (left === 0 && !done && !asked) {
        asked = true;
        void query.reload();
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [exam?.server_time, done]);
  function accept(r: { data: ExamAttempt }) {
    if (!latest.current || latest.current.revision <= r.data.revision) {
      latest.current = r.data;
      query.setData(r);
    }
    setSubmission(null);
    setFinishing(null);
  }
  function save(s: Save) {
    query.cancel();
    setSubmission(s);
    void task.run(
      () =>
        api.request(
          "put",
          "/api/v1/contexts/{context}/exam-attempts/{exam}/answers/{answer}",
          {
            params: { context: context.id, exam: id, answer: s.row },
            body: { base_version: s.revision, selected_option_id: s.option },
          },
        ),
      accept,
    );
  }
  function finish(revision: number) {
    query.cancel();
    setFinishing(revision);
    void task.run(
      () =>
        api.request(
          "post",
          "/api/v1/contexts/{context}/exam-attempts/{exam}/finish",
          {
            params: { context: context.id, exam: id },
            body: { base_version: revision },
          },
        ),
      accept,
    );
  }
  async function reconcile() {
    await query.reload();
    setSubmission(null);
    setFinishing(null);
    task.reset();
  }
  if (!exam)
    return query.error ? (
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.reload();
        }}
      />
    ) : (
      <Loading />
    );
  const blocked = task.pending || submission !== null || finishing !== null;
  const locked = done || blocked || seconds === 0;
  const row = exam.questions[index];
  const answered = exam.questions.filter(
    (q) => q.selected_option_id !== null,
  ).length;
  return (
    <>
      <ConfirmDialog
        visible={confirm && !done}
        title="Denemeyi bitir"
        message={`${exam.question_count - answered} soru boş. Bitirip sonucu görmek istiyor musun?`}
        confirm={() => finish(exam.revision)}
        cancel={() => setConfirm(false)}
        disabled={blocked}
      />
      <Heading>{done ? "Deneme sonucun" : "Denemen devam ediyor"}</Heading>
      {done && exam.result && (
        <Card>
          <Text style={[styles.title, { fontSize: 38 }]}>
            %{exam.result.score_percent}
          </Text>
          <Text style={styles.text}>
            {exam.result.correct} doğru · {exam.result.incorrect} yanlış ·{" "}
            {exam.result.blank} boş
          </Text>
          <Text style={styles.muted}>
            {exam.finish_reason === "expired"
              ? "Süre dolduğunda tamamlandı."
              : "Denemeyi sen bitirdin."}{" "}
            Çalışma puanı; geçme / kalma kararı değildir.
          </Text>
        </Card>
      )}
      <Card>
        <View style={styles.row}>
          <Text style={styles.heading}>
            Soru {index + 1} / {exam.question_count}
          </Text>
          {!done && (
            <Text accessibilityLabel="Kalan süre" style={styles.heading}>
              {timeLabel(seconds)}
            </Text>
          )}
        </View>
        <Text style={styles.heading}>{row.question.stem}</Text>
        <View accessibilityRole="radiogroup">
          {row.question.options.map((o) => {
            const selected =
              submission?.row === row.id
                ? submission.option === o.id
                : row.selected_option_id === o.id;
            const correct = done && row.feedback?.correct_option_id === o.id;
            return (
              <Pressable
                key={o.id}
                accessibilityRole="radio"
                accessibilityLabel={o.text}
                accessibilityState={{ checked: selected, disabled: locked }}
                disabled={locked}
                onPress={() =>
                  save({ row: row.id, option: o.id, revision: exam.revision })
                }
                style={[
                  styles.option,
                  selected && styles.selected,
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
              secondary
              disabled={locked || row.selected_option_id === null}
              onPress={() =>
                save({ row: row.id, option: null, revision: exam.revision })
              }
            >
              Cevabı temizle
            </Button>
            <Text style={styles.muted}>
              {task.pending
                ? "Kaydediliyor…"
                : blocked
                  ? "Kayıt doğrulanmalı"
                  : "Cevaplar sunucuda kayıtlı"}
            </Text>
          </>
        )}
        {done && row.feedback && (
          <>
            <Text style={styles.heading}>
              {row.feedback.outcome === "correct"
                ? "Doğru"
                : row.feedback.outcome === "incorrect"
                  ? "Yanlış"
                  : "Boş bırakıldı"}
            </Text>
            {row.feedback.explanation && (
              <Text style={styles.text}>{row.feedback.explanation}</Text>
            )}
          </>
        )}
        <ErrorNotice
          error={task.error}
          retry={
            task.error instanceof ApiError && task.error.status === 409
              ? () => {
                  void reconcile();
                }
              : submission
                ? () => save(submission)
                : finishing !== null
                  ? () => finish(finishing)
                  : undefined
          }
        />
        {task.error ? (
          <Button
            secondary
            disabled={task.pending}
            onPress={() => {
              void reconcile();
            }}
          >
            Güncel kaydı yükle
          </Button>
        ) : null}
        <ErrorNotice
          error={query.error}
          retry={() => {
            void query.reload();
          }}
        />
        {seconds === 0 && !done && (
          <Text style={styles.text}>
            Süre doldu. Sunucudan sonuç bekleniyor; bağlantı dönünce kayıt
            yenilenir.
          </Text>
        )}
        <View style={styles.row}>
          <Button
            secondary
            disabled={index === 0 || blocked}
            onPress={() => setIndex(index - 1)}
          >
            Önceki soru
          </Button>
          <Button
            secondary
            disabled={index === exam.question_count - 1 || blocked}
            onPress={() => setIndex(index + 1)}
          >
            Sonraki soru
          </Button>
        </View>
      </Card>
      <Card>
        <Text style={styles.heading}>
          {answered} / {exam.question_count} cevaplandı
        </Text>
        <View style={styles.row}>
          {exam.questions.map((q, i) => (
            <Pressable
              key={q.id}
              accessibilityRole="button"
              accessibilityLabel={`Soru ${i + 1}`}
              accessibilityState={{ selected: i === index, disabled: blocked }}
              disabled={blocked}
              onPress={() => setIndex(i)}
              style={[
                styles.smallButton,
                q.selected_option_id && styles.selected,
                i === index && { borderWidth: 2, borderColor: "#286549" },
              ]}
            >
              <Text style={styles.text}>{i + 1}</Text>
            </Pressable>
          ))}
        </View>
        {!done && (
          <Button disabled={locked} onPress={() => setConfirm(true)}>
            Denemeyi bitir
          </Button>
        )}
      </Card>
    </>
  );
}
