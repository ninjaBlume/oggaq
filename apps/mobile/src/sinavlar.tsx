import { useEffect, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { newId } from "./ids";
import { ApiError, cursorFromLink } from "@oggaq/api-client";
import type { ExamAttempt, Page, StudyContext, components } from "@oggaq/shared-types";
import { suggestedMinutes } from "@oggaq/study-core";
import { api } from "./api";
import { useOnReturn, useResource, useTask } from "./hooks";
import { Badge, Button, Card, EmptyState, ErrorNotice, Field, Loading, ScreenTitle, Sheet, palette, styles } from "./ui";
import { ChoiceGroup } from "./expressive";
import { BookOpen, ChevronDown, Clock3 } from "./icons";

type OfficialExam = components["schemas"]["OfficialExam"];
type Summary = components["schemas"]["ExamSummary"];
type StartInput = components["schemas"]["StartExamInput"];

async function collect<T>(
  fetchPage: (cursor?: string) => Promise<{ data: T[]; links: { next: string | null } }>,
): Promise<T[]> {
  const result: T[] = [];
  let cursor: string | undefined;
  do {
    const page = await fetchPage(cursor);
    result.push(...page.data);
    const next = cursorFromLink(page.links.next);
    if (next && next === cursor) throw new Error("Tekrarlanan sayfalama yanıtı.");
    cursor = next;
  } while (cursor);
  return result;
}

function progressOf(attempts: Summary[], examId: string) {
  const mine = attempts.filter((attempt) => attempt.official_exam?.id === examId);
  const open = mine.find((attempt) => attempt.status === "active");
  const finished = mine.filter((attempt) => attempt.status === "completed" && attempt.result);
  return {
    open,
    runs: finished.length,
    best: finished.length ? Math.max(...finished.map((attempt) => attempt.result!.score_percent)) : null,
  };
}

// One exam: what the student did before, and the way in (start with a duration, or continue the open attempt).
function ExamEntry({
  context,
  exam,
  title,
  attempts,
  open,
}: {
  context: StudyContext;
  exam: OfficialExam;
  title: string;
  attempts: Summary[];
  open: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [minutes, setMinutes] = useState(String(suggestedMinutes(exam)));
  const submission = useRef<StartInput | null>(null);
  const task = useTask<{ data: ExamAttempt }>();
  const progress = progressOf(attempts, exam.id);
  const expired = progress.open && Date.parse(progress.open.deadline_at) <= Date.parse(progress.open.server_time);
  function begin() {
    submission.current ??= {
      id: newId(),
      official_exam_id: exam.id,
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
        open(response.data.id);
      },
    );
  }
  // A rejected start (409/422) is not a lost response: the next try is a new attempt id.
  useEffect(() => {
    if (task.error instanceof ApiError && [409, 422].includes(task.error.status)) submission.current = null;
  }, [task.error]);
  const locked = task.pending || (submission.current !== null && !(task.error instanceof ApiError && [409, 422].includes(task.error.status)));
  const valid = Number(minutes) >= 1 && Number(minutes) <= 180;
  return (
    <Card>
      <Text style={styles.heading}>{title}</Text>
      <Text style={styles.muted}>
        {[
          exam.term ? `${exam.term} ${exam.year}` : String(exam.year),
          `${exam.question_count} soru`,
          `önerilen süre ${suggestedMinutes(exam)} dk`,
        ].join(" · ")}
      </Text>
      <View style={{ alignSelf: "flex-start" }}>
        <Badge tone={progress.runs > 0 ? "success" : "neutral"}>
          {progress.runs === 0 && !progress.open
            ? "Henüz girmedin"
            : [
                progress.open ? (expired ? "Süresi dolmuş deneme var" : "Devam eden denemen var") : null,
                progress.runs > 0 ? `${progress.runs} kez · en iyi %${progress.best}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
        </Badge>
      </View>
      {progress.open ? (
        <Button onPress={() => open(progress.open!.id)}>{expired ? "Sonucu gör" : "Devam et"}</Button>
      ) : !expanded ? (
        <Button onPress={() => setExpanded(true)}>{progress.runs > 0 ? "Tekrar gir" : "Sınava gir"}</Button>
      ) : (
        <View style={{ gap: 12 }}>
          <Field label="Süre (dakika)" numeric value={minutes} onChange={setMinutes} editable={!locked} />
          <Text style={styles.muted}>Sınav başlayınca süre işler; süre dolunca sınav kendiliğinden biter.</Text>
          <Button disabled={locked || !valid} onPress={begin}>
            {task.pending ? "Sınav hazırlanıyor…" : "Sınavı başlat"}
          </Button>
          <Button secondary disabled={locked} onPress={() => setExpanded(false)}>
            Vazgeç
          </Button>
          <ErrorNotice error={task.error} retry={begin} />
        </View>
      )}
    </Card>
  );
}

const byNewest = (a: OfficialExam, b: OfficialExam) =>
  b.year - a.year || (Number(b.exam_number) || 0) - (Number(a.exam_number) || 0);

// Deneme Sınavı = a whole exam (no subject), Ders Sınavı = one subject's questions of an exam number.
export function ExamList({
  context,
  kind,
  open,
  initialSubject,
}: {
  context: StudyContext;
  kind: "deneme" | "ders";
  open: (id: string) => void;
  initialSubject?: string;
}) {
  const [weapon, setWeapon] = useState<"armed" | "unarmed">("armed");
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const [picking, setPicking] = useState(false);
  const exams = useResource(
    (signal) => collect((cursor) => api.request("get", "/api/v1/official-exams", { signal, query: { per_page: 100, cursor } })),
    [],
  );
  const subjects = useResource(
    (signal) => collect((cursor) => api.request("get", "/api/v1/subjects", { signal, query: { per_page: 100, cursor } })),
    [],
    kind === "ders",
  );
  const attempts = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        query: { per_page: 100 },
        signal,
      }),
    [context.id],
  );
  useOnReturn(() => {
    void attempts.reload();
  });
  const all = exams.data ?? [];
  const wholeExams = all.filter((exam) => !exam.subject && exam.weapon_status === weapon).sort(byNewest);
  const subjectExams = all.filter((exam) => exam.subject);
  const withExams = (subjects.data ?? []).filter((item) => subjectExams.some((exam) => exam.subject?.id === item.id));
  const selected = withExams.find((item) => item.id === subject) ?? withExams[0];
  const list = kind === "deneme" ? wholeExams : subjectExams.filter((exam) => exam.subject?.id === selected?.id).sort(byNewest);
  const loading = exams.loading || (kind === "ders" && subjects.loading);
  const failure = exams.error ?? (kind === "ders" ? subjects.error : null);
  return (
    <>
      <ScreenTitle
        title={kind === "deneme" ? "Deneme sınavları" : "Ders sınavları"}
        subtitle={
          kind === "deneme"
            ? "Geçmiş sınavın tamamını gerçek düzende ve süreyle çöz. Silahlı sınav 125, silahsız sınav 100 sorudur."
            : "Bir ders seç ve o dersin geçmiş sınavlardaki sorularını sınav olarak çöz."
        }
      />
      {kind === "deneme" && (
        <ChoiceGroup
          choices={[
            { value: "armed", label: "Silahlı sınav", accessibilityLabel: "Silahlı sınavlar" },
            { value: "unarmed", label: "Silahsız sınav", accessibilityLabel: "Silahsız sınavlar" },
          ]}
          value={weapon}
          onChange={setWeapon}
        />
      )}
      {kind === "ders" && withExams.length > 0 && (
        <>
          {/* Eleven long subject names do not fit a one-row segmented control: the subject is picked from a list. */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ders seçimi"
            onPress={() => setPicking(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 10,
              backgroundColor: palette.white,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.primary,
            }}
          >
            <BookOpen size={18} color={palette.primary} />
            <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: palette.ink }}>
              {selected?.name}
            </Text>
            <ChevronDown size={16} color={palette.muted} />
          </Pressable>
          <Sheet visible={picking} title="Hangi dersin sınavları?" close={() => setPicking(false)}>
            {withExams.map((item) => (
              <Button
                key={item.id}
                secondary={item.id !== selected?.id}
                onPress={() => {
                  setSubject(item.id);
                  setPicking(false);
                }}
              >
                {item.name}
              </Button>
            ))}
          </Sheet>
        </>
      )}
      {loading ? (
        <Loading />
      ) : failure ? (
        <ErrorNotice
          error={failure}
          retry={() => {
            void exams.reload();
            void subjects.reload();
          }}
        />
      ) : list.length === 0 ? (
        <EmptyState
          icon={Clock3}
          title={kind === "deneme" ? "Henüz deneme sınavı yok" : "Henüz ders sınavı yok"}
          message="Yayımlanmış bir sınav olduğunda burada görünür."
        />
      ) : (
        <>
          <ErrorNotice error={attempts.error} retry={() => void attempts.reload()} />
          {list.map((exam) => (
            <ExamEntry
              key={exam.id}
              context={context}
              exam={exam}
              title={`${exam.exam_number ? `${exam.exam_number}. ` : ""}${kind === "deneme" ? "Deneme Sınavı" : "Ders Sınavı"}`}
              attempts={attempts.data?.data ?? []}
              open={open}
            />
          ))}
        </>
      )}
    </>
  );
}

// Every exam the student entered, newest first; an open attempt continues, a finished one shows its result.
export function Results({ context, openExam }: { context: StudyContext; openExam: (id: string) => void }) {
  const [cursor, setCursor] = useState<string>();
  const exams = useResource(
    (signal) =>
      api.request("get", "/api/v1/contexts/{context}/exam-attempts", {
        params: { context: context.id },
        query: { cursor, per_page: 10 },
        signal,
      }),
    [context.id, cursor],
  );
  useOnReturn(() => {
    void exams.reload();
  });
  return (
    <>
      <ScreenTitle title="Sonuçlarım" subtitle="Girdiğin deneme ve ders sınavları. Bir sınavı açıp cevaplarını tek tek incele." />
      {exams.loading ? (
        <Loading />
      ) : exams.error ? (
        <ErrorNotice error={exams.error} retry={() => void exams.reload()} />
      ) : exams.data?.data.length === 0 ? (
        <EmptyState icon={Clock3} title="Henüz bir sınava girmedin" message="Girdiğin sınavlar ve sonuçların burada görünür." />
      ) : (
        exams.data?.data.map((e) => (
          <Card key={e.id}>
            <Text style={styles.heading}>{e.official_exam?.title ?? `${e.question_count} soruluk deneme`}</Text>
            <Text style={styles.muted}>{new Date(e.started_at).toLocaleDateString("tr-TR")} · {e.duration_seconds / 60} dakika</Text>
            <View style={{ alignSelf: "flex-start" }}>
              <Badge tone={e.status === "completed" ? "success" : "primary"}>
                {e.status === "active" ? "Devam ediyor" : e.result ? `%${e.result.score_percent} doğru` : "Sonuç bekleniyor"}
              </Badge>
            </View>
            <Button secondary onPress={() => openExam(e.id)}>
              {e.status === "active" ? "Sınava dön" : "Sonucu incele"}
            </Button>
          </Card>
        ))
      )}
      {exams.data && <Pagination page={exams.data} change={setCursor} />}
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
