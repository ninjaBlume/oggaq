import { Text } from "./text";
import { cardDensity, cardTone } from "@oggaq/design-tokens";
import { CatalogCache } from "./catalog-cache";
import { useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { newId } from "./ids";
import { ApiError, cursorFromLink } from "@oggaq/api-client";
import type { ExamAttempt, Page, StudyContext, components } from "@oggaq/shared-types";
import { examDisplayTitle, examPeriodLabel, examQuestionTitle, suggestedMinutes, vocabulary, examTimerChoices, type ExamTimerPolicy } from "@oggaq/study-core";
import { api } from "./api";
import { useOnReturn, useResource, useTask } from "./hooks";
import {
  Badge,
  Button,
  Columns,
  EmptyState,
  ErrorNotice,
  Field,
  Loading,
  ScreenTitle,
  Sheet,
  percent,
  SplitBar,
  SplitLegend,
} from "./ui";
import { ChoiceGroup } from "./expressive";
import { BookOpen, ChevronDown, ChevronRight, Clock3 } from "./icons";
import { scoreTone, shape } from "./theme";
import { useLayout, useTheme } from "./themeContext";

const catalogCache = new CatalogCache();

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
  open: (id: string, initialExam?: ExamAttempt) => void;
}) {
  const { styles, palette } = useTheme();
  const tint = cardTone(palette, exam.subject ? "indigo" : "blue");
  const [expanded, setExpanded] = useState(false);
  const [minutes, setMinutes] = useState(String(suggestedMinutes(exam)));
  const [timerPolicy, setTimerPolicy] = useState<ExamTimerPolicy>('continuous');
  const submission = useRef<StartInput | null>(null);
  const task = useTask<{ data: ExamAttempt }>();
  const progress = progressOf(attempts, exam.id);
  const expired = progress.open && Date.parse(progress.open.deadline_at) <= Date.parse(progress.open.server_time);
  function begin() {
    submission.current ??= {
      id: newId(),
      official_exam_id: exam.id,
      duration_seconds: Math.round(Number(minutes)) * 60, timer_policy: timerPolicy,
    };
    void task.run(
      () =>
        api.request("post", "/api/v1/contexts/{context}/exam-attempts", {
          params: { context: context.id },
          body: submission.current!,
        }),
      (response) => {
        submission.current = null;
        open(response.data.id, response.data);
      },
    );
  }
  // A rejected start (409/422) is not a lost response: the next try is a new attempt id.
  useEffect(() => {
    if (task.error instanceof ApiError && ([409, 422].includes(task.error.status) || task.error.problem.code === 'timer_unavailable')) submission.current = null;
  }, [task.error]);
  const locked = task.pending || (submission.current !== null && !(task.error instanceof ApiError && ([409, 422].includes(task.error.status) || task.error.problem.code === 'timer_unavailable')));
  const valid = Number(minutes) >= 1 && Number(minutes) <= 180;
  return (
    <View testID="official-exam-entry" style={{ paddingHorizontal: 14, paddingVertical: cardDensity.paddingY, gap: cardDensity.rowGap, borderRadius: shape.large, backgroundColor: tint.surface, borderWidth: 1, borderColor: progress.open && !expired ? palette.primary : tint.line }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ width: cardDensity.iconSize, height: cardDensity.iconSize, borderRadius: shape.control, alignItems: "center", justifyContent: "center", backgroundColor: tint.iconSurface }}>
          <BookOpen size={21} color={tint.accent} />
        </View>
        <Text accessibilityRole="header" style={[styles.heading, { flex: 1, fontSize: 17, lineHeight: 24 }]}>{title}</Text>
      </View>
      <Text style={styles.muted}>
        {[examPeriodLabel(exam), `${exam.question_count} soru`, `önerilen süre ${suggestedMinutes(exam)} dk`].join(" · ")}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
        <View style={{ flexGrow: 1, flexBasis: 100 }}>
          <Text style={[styles.muted, progress.open && !expired && { color: palette.primary, fontWeight: "700" }]}>
            {progress.open ? (progress.open.timer_paused ? "Süre duraklatıldı" : expired ? "Süresi doldu" : "Devam ediyor") : progress.runs > 0 ? `${progress.runs} kez · en iyi %${progress.best}` : "Henüz girmedin"}
          </Text>
        </View>
        {progress.open ? (
          <Button compact secondary={!!expired} onPress={() => open(progress.open!.id)}>{expired ? "Sonucu gör" : "Devam et"}</Button>
        ) : !expanded ? (
          <Button compact secondary onPress={() => setExpanded(true)}>{progress.runs > 0 ? "Tekrar gir" : "Sınava gir"}</Button>
        ) : null}
      </View>
      {expanded && !progress.open && (
        <View style={{ gap: 12 }}>
          <Field label="Süre (dakika)" numeric value={minutes} onChange={setMinutes} editable={!locked} />
          <Text style={styles.muted}>Süre tercihini seç. Süre dolunca sınav kendiliğinden biter.</Text>
          <ChoiceGroup choices={examTimerChoices.map(choice => ({...choice, accessibilityLabel: choice.label}))} value={timerPolicy} disabled={locked} onChange={value => setTimerPolicy(value as ExamTimerPolicy)} />
          {timerPolicy === 'pause_on_exit' && <Text style={styles.muted}>Normal çıkışta süre durur. Ani kapanma veya bağlantı kaybında 30 saniyeye kadar işlemeye devam edebilir.</Text>}
          <Button disabled={locked || !valid} onPress={begin}>
            {task.pending ? "Sınav hazırlanıyor…" : "Sınavı başlat"}
          </Button>
          <Button secondary disabled={locked} onPress={() => setExpanded(false)}>
            Vazgeç
          </Button>
          <ErrorNotice error={task.error} retry={begin} />
        </View>
      )}
    </View>
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
  open: (id: string, initialExam?: ExamAttempt) => void;
  initialSubject?: string;
}) {
  const { palette } = useTheme();
  const [education, setEducation] = useState<"basic" | "renewal">("basic");
  const [weapon, setWeapon] = useState<"armed" | "unarmed">("armed");
  const [subject, setSubject] = useState<string | undefined>(initialSubject);
  const [picking, setPicking] = useState(false);
  const subjects = useResource(
    (signal) => catalogCache.read(`${context.id}:subjects`, signal, () => collect((cursor) => api.request("get", "/api/v1/subjects", { signal, query: { per_page: 100, cursor, with_exam_counts: true } }))),
    [context.id], kind === "ders",
  );
  const withExams = (subjects.data ?? []).filter((item) => (item.published_exam_count ?? 0) > 0);
  const selected = withExams.find((item) => item.id === subject) ?? withExams[0];
  const subjectId = kind === "ders" ? selected?.id : undefined;
  const exams = useResource(
    (signal) => catalogCache.read(`${context.id}:${kind}:${kind === "deneme" ? `${education}:${weapon}` : subjectId}`, signal, () => collect((cursor) => api.request("get", "/api/v1/official-exams", { signal, query: { per_page: 100, cursor, scope: kind === "deneme" ? "whole" : "subject", ...(kind === "deneme" ? { education_type: education, weapon_status: weapon } : { subject_id: subjectId }) } }))),
    [context.id, kind, education, weapon, subjectId], kind === "deneme" || !!subjectId,
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
    void exams.reload();
    void subjects.reload();
  });
  const all = exams.data ?? [];
  // The existing archive is basic education; keep it visible during a rolling API update.
  const wholeExams = all.filter((exam) => !exam.subject && exam.weapon_status === weapon && (exam.education_type ?? "basic") === education).sort(byNewest);
  const subjectExams = all.filter((exam) => exam.subject);
  const list = kind === "deneme" ? wholeExams : subjectExams.filter((exam) => exam.subject?.id === selected?.id).sort(byNewest);
  const loading = (exams.loading && !exams.data) || (attempts.loading && !attempts.data)
    || (kind === "ders" && subjects.loading && !subjects.data);
  const failure = exams.error ?? (kind === "ders" ? subjects.error : null);
  return (
    <>
      <ScreenTitle
        title={kind === "deneme" ? vocabulary.deneme.title : vocabulary.ders.title}
        subtitle={
          kind === "deneme"
            ? vocabulary.deneme.description
            : vocabulary.ders.description
        }
      />
      {kind === "deneme" && (
        <ChoiceGroup
          choices={[
            { value: "basic", label: "Temel eğitim", accessibilityLabel: "Temel eğitim sınavları" },
            { value: "renewal", label: "Yenileme eğitimi", accessibilityLabel: "Yenileme eğitimi sınavları" },
          ]}
          value={education}
          onChange={setEducation}
        />
      )}
      {kind === "deneme" && (
        <ChoiceGroup
          choices={[
            { value: "armed", label: "Silahlı", accessibilityLabel: "Silahlı" },
            { value: "unarmed", label: "Silahsız", accessibilityLabel: "Silahsız" },
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
              backgroundColor: palette.surface,
              padding: 14,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: palette.primary,
            }}
          >
            <BookOpen size={18} color={palette.primary} />
            <Text style={{ flex: 1, fontSize: 14, lineHeight: 21, fontWeight: "700", color: palette.ink }}>
              {selected?.name}
            </Text>
            <ChevronDown size={16} color={palette.muted} />
          </Pressable>
          <Sheet visible={picking} title="Hangi dersin sınavları?" close={() => setPicking(false)}>
            {withExams.map((item) => (
              <Button
                key={item.id}
                secondary={item.id !== selected?.id}
                alignStart
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
        <Loading layout="list" label="Sınavlar yükleniyor" />
      ) : failure ? (
        <ErrorNotice
          title="Sınavlar yüklenemedi"
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
          message={kind === "deneme" ? `Seçtiğin ${education === "basic" ? "temel" : "yenileme"} eğitimi için yayımlanmış sınav olduğunda burada görünür.` : "Yayımlanmış bir sınav olduğunda burada görünür."}
        />
      ) : (
        <>
          <ErrorNotice title="Önceki sınav bilgilerin yüklenemedi" error={attempts.error} retry={() => void attempts.reload()} />
          <Columns>
            {list.map((exam) => (
              <ExamEntry
                key={exam.id}
                context={context}
                exam={exam}
                title={kind === "deneme" ? examQuestionTitle(exam) : `${exam.exam_number ? `${exam.exam_number}. ` : ""}Ders Sınavı`}
                attempts={attempts.data?.data ?? []}
                open={open}
              />
            ))}
          </Columns>
        </>
      )}
    </>
  );
}

// One attempt of the history: the score first, then what the exam was, then how the answers split.
function ResultCard({ attempt: e, open }: { attempt: Summary; open: () => void }) {
  const { palette, styles } = useTheme();
  const layout = useLayout();
  const live = e.status === "active" && Date.parse(e.deadline_at) > Date.parse(e.server_time);
  const result = e.result;
  const title = e.official_exam ? examDisplayTitle(e.official_exam.title) : `${e.question_count} soruluk deneme`;
  const kind = e.official_exam ? (/Ders Sınavı/.test(e.official_exam.title) ? "DERS SINAVI" : "DENEME SINAVI") : "DENEME";
  const tint = cardTone(palette, kind === "DERS SINAVI" ? "indigo" : "blue");
  const tone = result ? scoreTone(result.score_percent, palette) : { backgroundColor: palette.softPrimary, color: palette.primary };
  const date = new Date(e.started_at).toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
  const minutes = Math.round((result ? result.elapsed_seconds : e.duration_seconds) / 60);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={live ? "Sınava dön" : `${title} sonucunu incele`}
      onPress={open}
      style={({ pressed }) => [
        { backgroundColor: tint.surface, borderWidth: 1, borderColor: tint.line, borderRadius: 24, paddingHorizontal: layout.cardPadding, paddingVertical: layout.cls === "compact" ? cardDensity.paddingY : cardDensity.paddingYWide, gap: cardDensity.gap },
        pressed && { borderColor: palette.primary },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
        <View style={{ minWidth: 76, height: 60, paddingHorizontal: 6, borderRadius: 20, alignItems: "center", justifyContent: "center", backgroundColor: tone.backgroundColor }}>
          {result ? (
            <Text numberOfLines={1} style={{ fontSize: 20, lineHeight: 26, fontWeight: "800", color: tone.color }}>{percent(result.score_percent)}</Text>
          ) : (
            <Clock3 size={26} color={tone.color} />
          )}
        </View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.eyebrow, { fontSize: 10 }]}>{kind}</Text>
          <Text numberOfLines={3} style={{ fontSize: 15, lineHeight: 21, fontWeight: "700", color: palette.ink }}>{title}</Text>
          <Text style={styles.muted}>{`${date} · ${minutes} dk · ${e.question_count} soru`}</Text>
        </View>
        <ChevronRight size={20} color={palette.muted} />
      </View>
      {result ? (
        <View style={{ gap: 8 }}>
          <SplitBar correct={result.correct} incorrect={result.incorrect} blank={result.blank} />
          <SplitLegend correct={result.correct} incorrect={result.incorrect} blank={result.blank} />
        </View>
      ) : (
        <View style={{ alignSelf: "flex-start" }}>
          <Badge>{e.timer_paused ? "Duraklatıldı" : live ? "Devam ediyor" : e.status === "active" ? "Süresi doldu" : "Sonuç bekleniyor"}</Badge>
        </View>
      )}
    </Pressable>
  );
}

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
      <ScreenTitle title={vocabulary.results.title} subtitle="Girdiğin deneme ve ders sınavları. Bir sınavı açıp tüm sorularını ve cevaplarını kaydırarak incele." />
      {exams.loading && !exams.data ? (
        <Loading layout="list" label="Sonuçların yükleniyor" />
      ) : exams.error ? (
        <ErrorNotice title="Sonuçların yüklenemedi" error={exams.error} retry={() => void exams.reload()} />
      ) : exams.data?.data.length === 0 ? (
        <EmptyState icon={Clock3} title="Henüz bir sınava girmedin" message="Girdiğin sınavlar ve sonuçların burada görünür." />
      ) : (
        <Columns>
          {exams.data?.data.map((e) => <ResultCard key={e.id} attempt={e} open={() => openExam(e.id)} />)}
        </Columns>
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
  const { styles } = useTheme();
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
