import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@oggaq/api-client";
import {
  anchorClock,
  remainingSeconds,
  timeLabel,
} from "@oggaq/study-core";
import type { ExamAttempt } from "@oggaq/shared-types";
import { api } from "./api";
import { PageIntro, useStudyContext } from "./App";
import { ErrorNotice, Loading } from "./ui";

export function Exam() {
  const context = useStudyContext();
  const { exam: id = "" } = useParams();
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["exam", context.id, id],
    queryFn: async ({ signal }) => {
      const response = await api.request(
        "get",
        "/api/v1/contexts/{context}/exam-attempts/{exam}",
        { params: { context: context.id, exam: id }, signal },
      );
      const cached = cache.getQueryData<{ data: ExamAttempt }>([
        "exam",
        context.id,
        id,
      ]);
      return cached && cached.data.revision > response.data.revision
        ? cached
        : response;
    },
    refetchInterval: (q) =>
      q.state.data?.data.status === "active" ? 15000 : false,
  });
  if (query.isPending) return <Loading />;
  if (query.isError)
    return (
      <ErrorNotice
        error={query.error}
        retry={() => {
          void query.refetch();
        }}
      />
    );
  return (
    <ExamContent
      key={id}
      exam={query.data.data}
      reload={() => query.refetch()}
    />
  );
}
type Save = { row: string; option: string | null; revision: number };
function ExamContent({
  exam,
  reload,
}: {
  exam: ExamAttempt;
  reload: () => Promise<unknown>;
}) {
  const context = useStudyContext();
  const cache = useQueryClient();
  const [index, setIndex] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [submission, setSubmission] = useState<Save | null>(null);
  const [finishSubmission, setFinishSubmission] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [awaitingResult, setAwaitingResult] = useState(false);
  const expiredRequest = useRef(false);
  const done = exam.status === "completed";
  useEffect(() => {
    const clock = anchorClock(
      exam.deadline_at,
      exam.server_time,
      performance.now(),
    );
    const tick = () => {
      const left = remainingSeconds(clock, performance.now());
      setSeconds(left);
      if (!done && left === 0 && !expiredRequest.current) {
        expiredRequest.current = true;
        setAwaitingResult(true);
        void reload().finally(() => {
          expiredRequest.current = false;
        });
      }
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
    // Each server response anchors a new monotonic clock; local time never grades an exam.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exam.server_time, exam.deadline_at, done]);
  useEffect(() => {
    if (done) {
      setSubmission(null);
      setFinishSubmission(null);
      setAwaitingResult(false);
    }
  }, [done]);
  function accept(response: { data: ExamAttempt }) {
    const current = cache.getQueryData<{ data: ExamAttempt }>([
      "exam",
      context.id,
      exam.id,
    ]);
    if (!current || current.data.revision <= response.data.revision)
      cache.setQueryData(["exam", context.id, exam.id], response);
    void cache.invalidateQueries({ queryKey: ["exams", context.id] });
    if (response.data.status === "completed") {
      void cache.invalidateQueries({ queryKey: ["stats", context.id] });
      void cache.invalidateQueries({ queryKey: ["review", context.id] });
    }
  }
  const save = useMutation({
    mutationFn: (s: Save) =>
      api.request(
        "put",
        "/api/v1/contexts/{context}/exam-attempts/{exam}/answers/{answer}",
        {
          params: { context: context.id, exam: exam.id, answer: s.row },
          body: { base_version: s.revision, selected_option_id: s.option },
        },
      ),
    onSuccess: (response) => {
      accept(response);
      setSubmission(null);
    },
  });
  // Favorites do not change the attempt revision, so the cached rows are updated directly.
  const favorite = useMutation({
    mutationFn: (next: boolean) =>
      next
        ? api.request(
            "put",
            "/api/v1/contexts/{context}/favorites/{question}",
            { params: { context: context.id, question: exam.questions[index]!.question_id } },
          )
        : api.request(
            "delete",
            "/api/v1/contexts/{context}/favorites/{question}",
            { params: { context: context.id, question: exam.questions[index]!.question_id } },
          ),
    onSuccess: (response) => {
      cache.setQueryData<{ data: ExamAttempt }>(
        ["exam", context.id, exam.id],
        (old) =>
          old && {
            data: {
              ...old.data,
              questions: old.data.questions.map((item) =>
                item.question_id === response.data.question_id
                  ? { ...item, is_favorite: response.data.favorite }
                  : item,
              ),
            },
          },
      );
      void cache.invalidateQueries({ queryKey: ["review", context.id] });
    },
  });
  const finish = useMutation({
    mutationFn: (revision: number) =>
      api.request(
        "post",
        "/api/v1/contexts/{context}/exam-attempts/{exam}/finish",
        {
          params: { context: context.id, exam: exam.id },
          body: { base_version: revision },
        },
      ),
    onSuccess: (response) => {
      accept(response);
      setFinishSubmission(null);
      setConfirm(false);
    },
  });
  const blocked =
    save.isPending ||
    finish.isPending ||
    submission !== null ||
    finishSubmission !== null;
  const locked = done || blocked || awaitingResult;
  const row = exam.questions[index];
  const answered = exam.questions.filter(
    (q) => q.selected_option_id !== null,
  ).length;
  function choose(option: string | null) {
    const s = { row: row.id, option, revision: exam.revision };
    setSubmission(s);
    save.mutate(s);
  }
  async function reconcile() {
    await reload();
    setSubmission(null);
    setFinishSubmission(null);
    save.reset();
    finish.reset();
    setConfirm(false);
  }
  const error = save.error ?? finish.error;
  const conflict = error instanceof ApiError && error.status === 409;
  return (
    <>
      <Link className="back-link" to={`/study/${context.id}/sonuclar`}>
        ← Sonuçlarıma dön
      </Link>
      <PageIntro
        eyebrow={done ? "DENEME TAMAMLANDI" : "SÜRELİ ÇALIŞMA"}
        title={done ? "Deneme sonucun" : "Denemen devam ediyor"}
      >
        <p>
          {done
            ? "Cevapların, başladığın soru sürümlerinden değerlendirildi."
            : "Cevapların seçtikçe kaydedilir. Süre bitmeden değiştirebilirsin."}
        </p>
      </PageIntro>
      {done && exam.result && (
        <section className="card exam-result" role="status">
          <div>
            <span className="eyebrow">DOĞRU YÜZDESİ</span>
            <strong>%{exam.result.score_percent}</strong>
          </div>
          <p>
            <b>{exam.result.correct}</b> doğru · <b>{exam.result.incorrect}</b>{" "}
            yanlış · <b>{exam.result.blank}</b> boş
          </p>
          <p>
            {exam.finish_reason === "expired"
              ? "Süre dolduğunda tamamlandı."
              : "Denemeyi sen bitirdin."}{" "}
            Çalışma puanı; geçme / kalma kararı değildir.
          </p>
        </section>
      )}
      <div className="practice-layout">
        <section className="card practice-card">
          <div className="question-meta">
            <span>
              Soru {index + 1} / {exam.question_count}
            </span>
            {!done && (
              <strong className="exam-timer" aria-label="Kalan süre">{timeLabel(seconds)}</strong>
            )}
          </div>
          <h2 className="question-stem">{row.question.stem}</h2>
          <fieldset className="answer-options" disabled={locked}>
            <legend className="sr-only">Deneme cevap seçenekleri</legend>
            {row.question.options.map((o) => {
              const selected =
                submission?.row === row.id
                  ? submission.option === o.id
                  : row.selected_option_id === o.id;
              const correct = done && row.feedback?.correct_option_id === o.id;
              return (
                <label
                  className={`answer-option ${correct ? "correct-option" : done && selected ? "incorrect-option" : selected ? "selected-option" : ""}`}
                  key={o.id}
                >
                  <input
                    type="radio"
                    name="exam-answer"
                    checked={selected}
                    onChange={() => choose(o.id)}
                  />
                  <span className="option-letter">
                    {String.fromCharCode(64 + o.position)}
                  </span>
                  <span className="option-text">{o.text}</span>
                  {correct && <span className="option-note">Doğru cevap</span>}
                </label>
              );
            })}
          </fieldset>
          {!done && (
            <div className="answer-actions">
              <button
                className="text-button"
                disabled={locked || row.selected_option_id === null}
                onClick={() => choose(null)}
              >
                Cevabı temizle
              </button>
              <span role="status">
                {save.isPending
                  ? "Kaydediliyor…"
                  : blocked
                    ? "Kayıt doğrulanmalı"
                    : "Cevaplar sunucuda kayıtlı"}
              </span>
            </div>
          )}
          {error && (
            <>
              <ErrorNotice
                error={error}
                retry={
                  conflict
                    ? () => {
                        void reconcile();
                      }
                    : submission
                      ? () => save.mutate(submission)
                      : finishSubmission !== null
                        ? () => finish.mutate(finishSubmission)
                        : undefined
                }
              />
              <button
                className="text-button"
                disabled={save.isPending || finish.isPending}
                onClick={() => {
                  void reconcile();
                }}
              >
                Güncel kaydı yükle
              </button>
            </>
          )}
          {awaitingResult && !done && (
            <div className="notice">
              Süre doldu. Sunucudan sonuç bekleniyor. Bağlantı dönünce kayıt
              yenilenir.
              <button
                className="text-button"
                onClick={() => {
                  void reload();
                }}
              >
                Sonucu kontrol et
              </button>
            </div>
          )}
          {done && row.feedback && (
            <section className={`feedback ${row.feedback.outcome}`}>
              <h3>
                {row.feedback.outcome === "correct"
                  ? "Doğru"
                  : row.feedback.outcome === "incorrect"
                    ? "Yanlış"
                    : "Boş bırakıldı"}
              </h3>
              {row.feedback.explanation && <p>{row.feedback.explanation}</p>}
              <button
                className="text-button"
                aria-pressed={row.is_favorite}
                disabled={favorite.isPending}
                onClick={() => favorite.mutate(!row.is_favorite)}
              >
                {row.is_favorite ? "★ Favorilerde" : "☆ Favoriye ekle"}
              </button>
              {favorite.isError && (
                <ErrorNotice
                  error={favorite.error}
                  retry={() => favorite.mutate(!row.is_favorite)}
                />
              )}
            </section>
          )}
          <div className="answer-actions">
            <button
              className="button secondary"
              disabled={index === 0 || blocked}
              onClick={() => setIndex(index - 1)}
            >
              Önceki soru
            </button>
            <button
              className="button secondary"
              disabled={index === exam.question_count - 1 || blocked}
              onClick={() => setIndex(index + 1)}
            >
              Sonraki soru
            </button>
          </div>
        </section>
        <aside className="practice-aside">
          <section className="card">
            {!done && (
              <div className="aside-timer">
                <span>Kalan süre</span>
                <strong aria-label="Kalan süre">{timeLabel(seconds)}</strong>
              </div>
            )}
            <h3>
              {done
                ? "Cevaplarını incele"
                : `${answered} / ${exam.question_count} cevaplandı`}
            </h3>
            <div className="exam-question-grid">
              {exam.questions.map((q, i) => (
                <button
                  key={q.id}
                  className={`button secondary ${q.selected_option_id ? "answered" : ""}`}
                  aria-label={`Soru ${i + 1}`}
                  aria-current={i === index ? "step" : undefined}
                  disabled={blocked}
                  onClick={() => setIndex(i)}
                >
                  {i + 1}
                </button>
              ))}
            </div>
            {!done && (
              <button
                className="button primary full"
                disabled={locked}
                onClick={() => setConfirm(true)}
              >
                Denemeyi bitir
              </button>
            )}
            {confirm && !done && (
              <div className="notice">
                <p>
                  {exam.question_count - answered} soru boş. Denemeyi bitirip
                  sonucu görmek istiyor musun?
                </p>
                <button
                  className="button primary full"
                  disabled={locked}
                  onClick={() => {
                    setFinishSubmission(exam.revision);
                    finish.mutate(exam.revision);
                  }}
                >
                  Bitir ve değerlendir
                </button>
                <button
                  className="text-button"
                  disabled={blocked}
                  onClick={() => setConfirm(false)}
                >
                  Devam et
                </button>
              </div>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
