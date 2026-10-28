import { Text } from "./text";
import { Pagination, ResultCard } from "./sinavlar";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { vocabulary } from "@oggaq/study-core";
import { typography } from "./theme";
import { newId } from "./ids";
import { ApiError } from "@oggaq/api-client";
import { featureIcons } from "./featureIcons";
import type { ExamAttempt, StudyContext, components } from "@oggaq/shared-types";
import { api } from "./api";
import { useOnReturn, useResource, useTask } from "./hooks";
import {
  Button,
  Card,
  Columns,
  EmptyState,
  ErrorNotice,
  ReadNotice,
  Field,
  Loading,
  ScreenTitle,
  SectionTitle,
  SplitBar,
  SplitLegend,
  percent,
} from "./ui";
import { useTheme } from "./themeContext";

type Kind = "incorrect" | "blank" | "favorite";
type StartInput = components["schemas"]["StartExamInput"];
const kinds: { id: Kind; label: string; hint: string; empty: string }[] = [
  {
    id: "incorrect",
    label: "Yanlışlarım",
    hint: "Son cevabın yanlış olan sorular. Doğru çözdüğünde listeden çıkar.",
    empty: "Şu an tekrar edeceğin yanlış soru yok.",
  },
  {
    id: "blank",
    label: "Boş bıraktıklarım",
    hint: "Son cevabın boş olan sorular. Çözdüğünde listeden çıkar.",
    empty: "Boş bıraktığın soru yok.",
  },
  {
    id: "favorite",
    label: "Favorilerim",
    hint: "Sınav sonucunda favoriye eklediğin sorular.",
    empty: "Henüz favori soru eklemedin.",
  },
];

// Reuse the question/timer engine while keeping review history and exam totals separate.
export function Review({
  context,
  openExam,
}: {
  context: StudyContext;
  openExam: (id: string, initialExam?: ExamAttempt) => void;
}) {
  const { styles } = useTheme();
  const [cursor, setCursor] = useState<string>();
  const history = useResource(signal => api.request("get", "/api/v1/contexts/{context}/exam-attempts", { params: { context: context.id }, query: { scope: "review", per_page: 10, cursor }, signal }), [context.id, cursor]);
  const summary = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/review-summary", {
        params: { context: context.id },
        signal,
      }),
    [context.id],
  );
  const reviews = history.data?.data.filter(item => item.review_kind != null) ?? [];
  useOnReturn(() => {
    void summary.reload();
    void history.reload();
  });
  return (
    <>
      <ScreenTitle
        title={vocabulary.review.title}
        subtitle="Yanlış, boş ve favori sorularını yeniden çöz. Çözümlerin soru ve doğruluk istatistiğine katılır; deneme sayısını ve ortalamasını değiştirmez."
        eyebrow="HATALARINDAN ÖĞREN"
      />
      <ReadNotice resource={summary} refreshOnly />
      {summary.loading && !summary.data ? (
        <Loading />
      ) : summary.error || !summary.data ? (
        <ReadNotice resource={summary} />
      ) : (
        kinds.map((kind) => (
          <ReviewExam
            key={kind.id}
            context={context}
            kind={kind}
            count={summary.data!.data[kind.id]}
            openExam={openExam}
          />
        ))
      )}
      <SectionTitle>Tekrar çalışmaların</SectionTitle>
      <ReadNotice resource={history} refreshOnly />
      {history.loading && !history.data ? <Loading label="Tekrar geçmişin yükleniyor" /> : history.error ? <ReadNotice resource={history} /> : reviews.length === 0 ? <Text style={styles.muted}>Tekrar çalışmaların ve kaldığın yer burada görünür.</Text> : reviews.map(item => <ResultCard key={item.id} attempt={item} open={() => openExam(item.id)} />)}
      {history.data && reviews.length > 0 && <Pagination page={history.data} change={setCursor} />}
    </>
  );
}

function ReviewExam({
  context,
  kind,
  count,
  openExam,
}: {
  context: StudyContext;
  kind: (typeof kinds)[number];
  count: number;
  openExam: (id: string, initialExam?: ExamAttempt) => void;
}) {
  const { styles } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [questions, setQuestions] = useState(String(Math.min(count, 20)));
  const [minutes, setMinutes] = useState(
    String(Math.max(5, Math.ceil(Math.min(count, 20) * 1.2))),
  );
  const submission = useRef<StartInput | null>(null);
  const task = useTask<{ data: ExamAttempt }>();
  function begin() {
    submission.current ??= {
      id: newId(),
      review_kind: kind.id,
      question_count: Number(questions),
      duration_seconds: Math.round(Number(minutes)) * 60,
    };
    void task.run(
      () =>
        api.request("post", "/api/v1/contexts/{context}/exam-attempts", {
          params: { context: context.id },
          body: submission.current!,
        }),
      (response) => {
        submission.current = null;
        openExam(response.data.id, response.data);
      },
    );
  }
  // A rejected start (409/422) is not a lost response: the next try is a new attempt id.
  useEffect(() => {
    if (task.error instanceof ApiError && [409, 422].includes(task.error.status))
      submission.current = null;
  }, [task.error]);
  const locked =
    task.pending ||
    (submission.current !== null &&
      !(task.error instanceof ApiError && [409, 422].includes(task.error.status)));
  const valid =
    Number(questions) >= 1 &&
    Number(questions) <= Math.min(count, 100) &&
    Number(minutes) >= 1 &&
    Number(minutes) <= 180;
  return (
    <Card tone="sand">
      <Text style={styles.heading}>{kind.label}</Text>
      <Text style={styles.muted}>
        {count === 0 ? kind.empty : `${count} soru · ${kind.hint}`}
      </Text>
      {count > 0 &&
        (!expanded ? (
          <Button onPress={() => setExpanded(true)}>Tekrar sınavına gir</Button>
        ) : (
          <View style={{ gap: 12 }}>
            <Field
              label="Soru sayısı"
              numeric
              value={questions}
              onChange={(value) => {
                setQuestions(value);
                setMinutes(String(Math.max(5, Math.ceil(Number(value) * 1.2))));
              }}
              editable={!locked}
            />
            <Field
              label="Süre (dakika)"
              numeric
              value={minutes}
              onChange={setMinutes}
              editable={!locked}
            />
            <Button disabled={locked || !valid} onPress={begin}>
              {task.pending ? "Sınav hazırlanıyor…" : "Sınavı başlat"}
            </Button>
            <Button secondary disabled={locked} onPress={() => setExpanded(false)}>
              Vazgeç
            </Button>
            <ErrorNotice error={task.error} retry={begin} />
          </View>
        ))}
    </Card>
  );
}

export function Stats({ context }: { context: StudyContext }) {
  const { palette, styles } = useTheme();
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/stats", {
        params: { context: context.id },
        signal,
      }),
    [context.id],
  );
  useOnReturn(() => {
    void query.reload();
  });
  const stats = query.data?.data;
  return (
    <>
      <ScreenTitle
        title={vocabulary.stats.title}
        subtitle="Cevapladığın sorulardan hesaplanır. Boş cevaplar doğru sayılmaz."
        eyebrow="İLERLEMEN"
      />
      <ReadNotice resource={query} refreshOnly />
      {query.loading && !query.data ? (
        <Loading />
      ) : query.error || !stats ? (
        <ReadNotice resource={query} />
      ) : stats.answers.total === 0 && stats.exams.completed === 0 ? (
        <EmptyState
          icon={featureIcons.stats}
          title="Henüz istatistik yok"
          message="Sınavlara girdikçe sonuçların burada görünür."
        />
      ) : (
        <>
          <Card tone="indigo">
            <Text style={styles.muted}>DOĞRULUK</Text>
            <Text style={[styles.heading, typography.display]}>
              {percent(stats.answers.accuracy_percent)}
            </Text>
            <Text style={styles.muted}>
              {`${stats.answers.correct} doğru · ${stats.answers.incorrect} yanlış · ${stats.answers.blank} boş`}
            </Text>
            <Text style={styles.muted}>
              {`${stats.answers.total} cevap · ${stats.exams.completed} tamamlanan deneme`}
            </Text>
            <Text style={styles.muted}>
              {`Deneme ortalaması ${percent(stats.exams.average_score_percent)} · en iyi ${percent(stats.exams.best_score_percent)}`}
            </Text>
          </Card>
          <SectionTitle>Derslere göre</SectionTitle>
          <Columns>
            {stats.subjects.map((subject) => (
              <Card key={subject.subject_id} tone="indigo">
                <Text style={styles.heading}>{subject.name}</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <View style={{ flex: 1 }}>
                    <SplitBar
                      correct={subject.correct}
                      incorrect={subject.incorrect}
                      blank={subject.blank}
                      height={10}
                      label={`${subject.name}: ${subject.correct} doğru, ${subject.incorrect} yanlış, ${subject.blank} boş`}
                    />
                  </View>
                  <Text
                    style={{
                      minWidth: 56,
                      textAlign: "right",
                      fontSize: 18,
                      fontWeight: "800",
                      color: palette.ink,
                    }}
                  >
                    {percent(subject.accuracy_percent)}
                  </Text>
                </View>
                <SplitLegend
                  correct={subject.correct}
                  incorrect={subject.incorrect}
                  blank={subject.blank}
                />
              </Card>
            ))}
          </Columns>
        </>
      )}
    </>
  );
}
