import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, cursorFromLink } from "@oggaq/api-client";
import { anchorClock, remainingSeconds, timeLabel } from "@oggaq/study-core";
import type { ExamAttempt, components } from "@oggaq/shared-types";
import { api } from "./api";
import { PageIntro, useStudyContext } from "./App";
import { CatalogPages } from "./study";
import { ErrorNotice, Field, Loading, dateLabel } from "./ui";

type StartInput = components["schemas"]["StartExamInput"];
export function Exams() {
  const context = useStudyContext();
  const navigate = useNavigate();
  const cache = useQueryClient();
  const [count, setCount] = useState(10);
  const [minutes, setMinutes] = useState(15);
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [cursor, setCursor] = useState<string>();
  const [subjectCursor, setSubjectCursor] = useState<string>();
  const [topicCursor, setTopicCursor] = useState<string>();
  const submission = useRef<StartInput | null>(null);
  const subjects = useQuery({
    queryKey: ["subjects", subjectCursor],
    queryFn: ({ signal }) =>
      api.request("get", "/api/v1/subjects", {
        signal,
        query: { per_page: 100, cursor: subjectCursor },
      }),
  });
  const topics = useQuery({
    queryKey: ["topics", subject, topicCursor],
    enabled: !!subject,
    queryFn: ({ signal }) =>
      api.request("get", "/api/v1/subjects/{subject}/topics", {
        params: { subject },
        query: { per_page: 100, cursor: topicCursor },
        signal,
      }),
  });
  const history = useQuery({
    queryKey: ["exams", context.id, cursor],
    queryFn: ({ signal }) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 20 },
        signal,
      }),
  });
  const start = useMutation({
    mutationFn: (body: StartInput) =>
      api.request("post", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        body,
      }),
    onSuccess: (response) => {
      cache.setQueryData(["exam", context.id, response.data.id], response);
      navigate(`/study/${context.id}/exams/${response.data.id}`);
    },
    onError: (error) => {
      if (error instanceof ApiError && [409, 422].includes(error.status))
        submission.current = null;
    },
  });
  function begin() {
    submission.current ??= {
      id: crypto.randomUUID(),
      question_count: count,
      duration_seconds: minutes * 60,
      subject_id: subject || null,
      topic_id: topic || null,
    };
    start.mutate(submission.current);
  }
  const locked = start.isPending || submission.current !== null;
  return (
    <>
      <PageIntro eyebrow="SÜREYLE ÇALIŞ" title="Deneme sınavı">
        <p>
          Soru sayısını ve süreni seç. Denemenin sonunda tüm cevaplarını
          birlikte incele.
        </p>
      </PageIntro>
      <section className="card exam-setup">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            begin();
          }}
        >
          <fieldset disabled={locked}>
            <legend>Yeni deneme</legend>
            <div className="exam-settings">
              <Field label="Soru sayısı">
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min={1}
                    max={100}
                    required
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                  />
                )}
              </Field>
              <Field label="Süre (dakika)">
                {(props) => (
                  <input
                    {...props}
                    type="number"
                    min={1}
                    max={120}
                    required
                    value={minutes}
                    onChange={(e) => setMinutes(Number(e.target.value))}
                  />
                )}
              </Field>
              <Field label="Deneme dersi">
                {(props) => (
                  <select
                    {...props}
                    value={subject}
                    onChange={(e) => {
                      setSubject(e.target.value);
                      setTopic("");
                      setTopicCursor(undefined);
                    }}
                  >
                    <option value="">Tüm dersler</option>
                    {subjects.data?.data.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
              <Field label="Deneme konusu">
                {(props) => (
                  <select
                    {...props}
                    disabled={!subject || locked}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                  >
                    <option value="">Tüm konular</option>
                    {topics.data?.data.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                )}
              </Field>
            </div>
          </fieldset>
          {subjects.data && (
            <CatalogPages
              label="Ders listesi"
              links={subjects.data.links}
              change={(cursor) => {
                setSubjectCursor(cursor);
                setSubject("");
                setTopic("");
              }}
            />
          )}
          {topics.data && (
            <CatalogPages
              label="Konu listesi"
              links={topics.data.links}
              change={(cursor) => {
                setTopicCursor(cursor);
                setTopic("");
              }}
            />
          )}
          <p className="muted">
            Süre başlatınca işler; uygulamadan ayrılınca durmaz. Puanın doğru
            cevap yüzdesidir. Bu çalışma resmî sınav şablonu değildir.
          </p>
          <button
            className="button primary"
            type="submit"
            disabled={
              locked || subjects.isPending || (!!subject && topics.isPending)
            }
          >
            {start.isPending ? "Hazırlanıyor…" : "Denemeyi başlat"}
          </button>
        </form>
        {start.isError && <ErrorNotice error={start.error} retry={begin} />}
        {(subjects.isError || topics.isError) && (
          <ErrorNotice
            error={subjects.error ?? topics.error}
            retry={() => {
              void subjects.refetch();
              void topics.refetch();
            }}
          />
        )}
      </section>
      <h2 className="section-title">Deneme geçmişim</h2>
      {history.isPending ? (
        <Loading />
      ) : history.isError ? (
        <ErrorNotice
          error={history.error}
          retry={() => {
            void history.refetch();
          }}
        />
      ) : history.data.data.length === 0 ? (
        <div className="card empty">
          <h3>Henüz denemen yok</h3>
          <p>Başladığın ve tamamladığın denemeler burada saklanır.</p>
        </div>
      ) : (
        <>
          <section className="history-list" aria-label="Deneme geçmişi">
            {history.data.data.map((exam) => (
              <Link
                key={exam.id}
                className="history-row"
                to={`/study/${context.id}/exams/${exam.id}`}
              >
                <span
                  className={`result-pill ${exam.status === "completed" ? "correct" : "pending"}`}
                >
                  {exam.status === "completed"
                    ? `%${exam.result?.score_percent}`
                    : "Devam et"}
                </span>
                <div>
                  <h3>{exam.question_count} soruluk deneme</h3>
                  <p>
                    {dateLabel(exam.started_at)} · {exam.duration_seconds / 60}{" "}
                    dakika
                  </p>
                </div>
                <span>→</span>
              </Link>
            ))}
          </section>
          <div className="pagination">
            <button
              className="button secondary"
              disabled={!history.data.links.prev}
              onClick={() => setCursor(cursorFromLink(history.data.links.prev))}
            >
              Önceki
            </button>
            <button
              className="button secondary"
              disabled={!history.data.links.next}
              onClick={() => setCursor(cursorFromLink(history.data.links.next))}
            >
              Sonraki
            </button>
          </div>
        </>
      )}
    </>
  );
}
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
      <Link className="back-link" to={`/study/${context.id}/exams`}>
        ← Denemelerime dön
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
              <strong aria-label="Kalan süre">{timeLabel(seconds)}</strong>
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
