import { useState } from "react";
import { Text, View } from "react-native";
import { ListChecks, Trophy } from "./icons";
import type { StudyContext } from "@oggaq/shared-types";
import { api } from "./api";
import { useOnReturn, useResource, useTask } from "./hooks";
import {
  Card,
  EmptyState,
  ErrorNotice,
  Loading,
  ScreenTitle,
  SectionTitle,
  TextLink,
  palette,
  styles,
} from "./ui";
import { ChoiceGroup } from "./expressive";
import { Pagination, QuestionCard } from "./study";

type Kind = "incorrect" | "blank" | "favorite";
const copy: Record<Kind, { empty: string; hint: string }> = {
  incorrect: {
    empty: "Şu an tekrar edeceğin yanlış soru yok.",
    hint: "Son cevabın yanlış olan sorular. Doğru çözdüğünde listeden çıkar.",
  },
  blank: {
    empty: "Boş bıraktığın soru yok.",
    hint: "Son cevabın boş olan sorular. Çözdüğünde listeden çıkar.",
  },
  favorite: {
    empty: "Henüz favori soru eklemedin.",
    hint: "Bir soruyu çözerken favoriye ekleyebilirsin.",
  },
};

export function Review({
  context,
  open,
}: {
  context: StudyContext;
  open: (id: string) => void;
}) {
  const [kind, setKind] = useState<Kind>("incorrect");
  const [cursor, setCursor] = useState<string>();
  const query = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/review-questions", {
        params: { context: context.id },
        query: { kind, per_page: 10, cursor },
        signal,
      }),
    [context.id, kind, cursor],
  );
  useOnReturn(() => {
    void query.reload();
  });
  return (
    <>
      <ScreenTitle
        title="Tekrar listelerim"
        subtitle={copy[kind].hint}
        eyebrow="TEKRAR ET"
      />
      <ChoiceGroup
        choices={[
          {
            value: "incorrect",
            label: "Yanlışlarım",
            accessibilityLabel: "Yanlışlarım",
          },
          {
            value: "blank",
            label: "Boşlarım",
            accessibilityLabel: "Boş bıraktıklarım",
          },
          {
            value: "favorite",
            label: "Favorilerim",
            accessibilityLabel: "Favorilerim",
          },
        ]}
        value={kind}
        onChange={(value) => {
          setKind(value);
          setCursor(undefined);
        }}
      />
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
          icon={ListChecks}
          title={copy[kind].empty}
          message="Soru çözdükçe bu liste güncellenir."
        />
      ) : (
        query.data?.data.map((q) => (
          <View key={`${kind}-${q.id}-${q.version.id}`} style={{ gap: 4 }}>
            <QuestionCard question={q} context={context} open={open} />
            {kind === "favorite" && (
              <RemoveFavorite
                context={context}
                question={q.id}
                done={() => {
                  void query.reload();
                }}
              />
            )}
          </View>
        ))
      )}
      {query.data && <Pagination page={query.data} change={setCursor} />}
    </>
  );
}

function RemoveFavorite({
  context,
  question,
  done,
}: {
  context: StudyContext;
  question: string;
  done: () => void;
}) {
  const task = useTask<unknown>();
  return (
    <>
      <TextLink
        onPress={() => {
          void task.run(
            () =>
              api.request(
                "delete",
                "/api/v1/contexts/{context}/favorites/{question}",
                { params: { context: context.id, question } },
              ),
            done,
          );
        }}
      >
        {task.pending ? "Çıkarılıyor…" : "Favorilerden çıkar"}
      </TextLink>
      <ErrorNotice error={task.error} />
    </>
  );
}

const percent = (value: number | null) =>
  value === null
    ? "—"
    : `%${value.toLocaleString("tr-TR", { maximumFractionDigits: 1 })}`;

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
          message="Soru çözdükçe ve deneme bitirdikçe sonuçların burada görünür."
        />
      ) : (
        <>
          <Card>
            <Text style={styles.muted}>DOĞRULUK</Text>
            <Text style={[styles.heading, { fontSize: 34 }]}>
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
              <View style={styles.between}>
                <Text style={styles.heading}>{subject.name}</Text>
                <Text style={styles.muted}>
                  {percent(subject.accuracy_percent)}
                </Text>
              </View>
              <View
                accessibilityRole="image"
                accessibilityLabel={`${subject.name}: ${subject.correct} doğru, ${subject.incorrect} yanlış, ${subject.blank} boş`}
                style={{
                  flexDirection: "row",
                  height: 10,
                  borderRadius: 5,
                  overflow: "hidden",
                  backgroundColor: palette.line,
                }}
              >
                <View
                  style={{
                    flex: subject.correct,
                    backgroundColor: palette.primary,
                  }}
                />
                <View style={{ flex: subject.incorrect, backgroundColor: "#c4574b" }} />
                <View style={{ flex: subject.blank }} />
              </View>
              <Text style={styles.muted}>
                {`${subject.correct} doğru · ${subject.incorrect} yanlış · ${subject.blank} boş`}
              </Text>
            </Card>
          ))}
        </>
      )}
    </>
  );
}
