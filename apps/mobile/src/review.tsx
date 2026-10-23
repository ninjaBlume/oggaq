import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { typography } from "./theme";
import { newId } from "./ids";
import { ApiError } from "@oggaq/api-client";
import { Trophy } from "./icons";
import type { ExamAttempt, StudyContext, components } from "@oggaq/shared-types";
import { api } from "./api";
import { useOnReturn, useResource, useTask } from "./hooks";
import {
  Button,
  Card,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  ScreenTitle,
  SectionTitle,
  palette,
  percent,
  styles,
} from "./ui";

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

// Review is an exam too: the student picks a list (wrong, blank, favorite) and sits a timed exam made of those questions.
export function Review({
  context,
  openExam,
}: {
  context: StudyContext;
  openExam: (id: string) => void;
}) {
  const summary = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/review-summary", {
        params: { context: context.id },
        signal,
      }),
    [context.id],
  );
  useOnReturn(() => {
    void summary.reload();
  });
  return (
    <>
      <ScreenTitle
        title="Tekrar sınavı"
        subtitle="Yanlış yaptığın, boş bıraktığın veya favoriye eklediğin sorulardan süreli bir sınav yap."
        eyebrow="HATALARINDAN ÖĞREN"
      />
      {summary.loading ? (
        <Loading />
      ) : summary.error || !summary.data ? (
        <ErrorNotice
          error={summary.error}
          retry={() => {
            void summary.reload();
          }}
        />
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
  openExam: (id: string) => void;
}) {
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
        openExam(response.data.id);
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
    <Card>
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
        title="Başarı durumum"
        subtitle="Cevapladığın sorulardan hesaplanır. Boş cevaplar doğru sayılmaz."
        eyebrow="İLERLEMEN"
      />
      {query.loading ? (
        <Loading />
      ) : query.error || !stats ? (
        <ErrorNotice
          error={query.error}
          retry={() => {
            void query.reload();
          }}
        />
      ) : stats.answers.total === 0 && stats.exams.completed === 0 ? (
        <EmptyState
          icon={Trophy}
          title="Henüz istatistik yok"
          message="Sınavlara girdikçe sonuçların burada görünür."
        />
      ) : (
        <>
          <Card>
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
          {stats.subjects.map((subject) => (
            <Card key={subject.subject_id}>
              <Text style={styles.heading}>{subject.name}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <View
                  accessibilityRole="image"
                  accessibilityLabel={`${subject.name}: ${subject.correct} doğru, ${subject.incorrect} yanlış, ${subject.blank} boş`}
                  style={{
                    flex: 1,
                    flexDirection: "row",
                    height: 10,
                    borderRadius: 5,
                    overflow: "hidden",
                    backgroundColor: palette.line,
                  }}
                >
                  <View style={{ flex: subject.correct, backgroundColor: palette.primary }} />
                  <View style={{ flex: subject.incorrect, backgroundColor: "#c4574b" }} />
                  <View style={{ flex: subject.blank }} />
                </View>
                <Text
                  style={{ minWidth: 56, textAlign: "right", fontSize: 18, fontWeight: "800", color: palette.ink }}
                >
                  {percent(subject.accuracy_percent)}
                </Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", columnGap: 16, rowGap: 6 }}>
                {[
                  [palette.primary, subject.correct, "doğru"],
                  ["#c4574b", subject.incorrect, "yanlış"],
                  [palette.line, subject.blank, "boş"],
                ].map(([color, count, label]) => (
                  <View key={String(label)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: String(color) }} />
                    <Text style={styles.muted}>{`${count} ${label}`}</Text>
                  </View>
                ))}
              </View>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
