import { useEffect, useRef, useState } from "react";
import type { ScrollViewInstance } from "react-native";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  ArrowRight,
  ChevronDown,
  Clock3,
  ListChecks,
} from "./icons";
import type { ExamAttempt, StudyContext } from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import { anchorClock, remainingSeconds, timeLabel, resumeQuestionIndex, ExamPositionSaver } from "@oggaq/study-core";
import { api } from "./api";
import { CompletedExam } from "./exam-results";
import { useResource, useResume, useTask } from "./hooks";
import {
  Button,
  Card,
  ConfirmDialog,
  ErrorNotice,
  Loading,
  Option,
  Sheet,
} from "./ui";
import { useBody, useLayout, useTheme } from "./themeContext";
// The numbered question buttons: in a sheet on narrow windows, in the side panel on expanded ones.
function QuestionMap({
  questions,
  index,
  blocked,
  choose,
}: {
  questions: ExamAttempt["questions"];
  index: number;
  blocked: boolean;
  choose: (index: number) => void;
}) {
  const { palette, styles } = useTheme();
  return (
    <View style={styles.row}>
      {questions.map((q, i) => (
        <Pressable
          key={q.id}
          accessibilityRole="button"
          accessibilityLabel={`Soru ${i + 1}`}
          accessibilityState={{ selected: i === index, disabled: blocked }}
          disabled={blocked}
          onPress={() => choose(i)}
          style={[
            styles.smallButton,
            q.selected_option_id !== null && {
              backgroundColor: palette.softPrimary,
            },
            i === index && { borderWidth: 2, borderColor: palette.primary },
          ]}
        >
          <Text
            style={{
              color: q.selected_option_id ? palette.primary : palette.muted,
              fontSize: 14,
              fontWeight: "700",
            }}
          >
            {i + 1}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
function TimerBadge({
  seconds,
  large = false,
}: {
  seconds: number;
  large?: boolean;
}) {
  const { palette } = useTheme();
  const urgent = seconds < 60;
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: urgent ? palette.softRed : palette.softPrimary,
        padding: large ? 14 : 10,
        borderRadius: 12,
      }}
    >
      <Clock3
        size={large ? 20 : 16}
        color={urgent ? palette.red : palette.primary}
      />
      <Text
        accessibilityLabel="Kalan süre"
        style={{
          color: urgent ? palette.red : palette.primary,
          fontSize: large ? 22 : 14,
          fontWeight: "800",
          fontVariant: ["tabular-nums"],
        }}
      >
        {timeLabel(seconds)}
      </Text>
    </View>
  );
}
type Save = { row: string; option: string | null; revision: number };
export function Exam({ context, id }: { context: StudyContext; id: string }) {
  const { palette, styles } = useTheme();
  const layout = useLayout();
  const body = useBody();
  // Expanded windows keep the question map and the clock in a side panel next to the question.
  const wide = layout.cls === "expanded";
  const latest = useRef<ExamAttempt | null>(null);
  const scroll = useRef<ScrollViewInstance>(null);
  const insets = useSafeAreaInsets();
  const [overview, setOverview] = useState(false);
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
  const [selectedIndex, setIndex] = useState<number | null>(null);
  const [positionState, setPositionState] = useState<{ pending: boolean; error: unknown }>({ pending: false, error: null });
  const positionSaver = useRef<ExamPositionSaver | null>(null);
  if (!positionSaver.current) positionSaver.current = new ExamPositionSaver(async (position) => {
    const response = await api.request('put', '/api/v1/contexts/{context}/exam-attempts/{exam}/position', { params: { context: context.id, exam: id }, body: { position } });
    if (response.data.status === 'completed') await query.reload();
  }, setPositionState);
  useEffect(() => {
    positionSaver.current!.listen(setPositionState);
    return () => positionSaver.current?.detach();
  }, []);
  const [submission, setSubmission] = useState<Save | null>(null);
  const [finishing, setFinishing] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const exam = query.data?.data;
  // Polling and another device may refresh the bookmark; only opening this screen restores it.
  const initialIndex = useRef<number | null>(null);
  if (initialIndex.current === null && exam) initialIndex.current = resumeQuestionIndex(exam);
  const index = selectedIndex ?? initialIndex.current ?? 0;
  const done = exam?.status === "completed";
  useEffect(() => {
    if (done) {
      scroll.current?.scrollTo({ y: 0, animated: false });
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
  function updateQuestion(questionId: string, patch: { is_favorite?: boolean; reported?: boolean }) {
    const mark = (value: ExamAttempt): ExamAttempt => ({
      ...value, questions: value.questions.map((item) => item.question_id === questionId ? { ...item, ...patch } : item),
    });
    if (latest.current) latest.current = mark(latest.current);
    query.setData((current) => current ? { data: mark(current.data) } : current);
  }
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
  if (done) return <CompletedExam exam={exam} context={context} updateQuestion={updateQuestion} error={query.error} reload={() => { void query.reload(); }} />;
  const blocked = task.pending || submission !== null || finishing !== null;
  const locked = done || blocked || seconds === 0;
  const row = exam.questions[index];
  const answered = exam.questions.filter(
    (q) => q.selected_option_id !== null,
  ).length;
  function choose(index: number) {
    setIndex(index);
    if (!done) positionSaver.current!.request(index + 1);
    setOverview(false);
    scroll.current?.scrollTo({ y: 0, animated: false });
  }
  return (
    <View style={styles.shell}>
      <ConfirmDialog
        visible={confirm && !done}
        title="Denemeyi bitir"
        message={`${exam.question_count - answered} soru boş. Bitirip sonucu görmek istiyor musun?`}
        confirm={() => finish(exam.revision)}
        cancel={() => setConfirm(false)}
        disabled={blocked}
      />
      {positionState.pending && <Text accessibilityRole="text" style={styles.muted}>Soru konumu kaydediliyor…</Text>}
      {positionState.error != null && <ErrorNotice title="Son baktığın soru kaydedilemedi" error={positionState.error} retry={() => positionSaver.current!.retry()} />}
      <Sheet
        visible={overview}
        title="Soruların"
        close={() => setOverview(false)}
      >
        <Text style={styles.muted}>
          {answered} / {exam.question_count} cevaplandı
        </Text>
        <QuestionMap
          questions={exam.questions}
          index={index}
          blocked={blocked}
          choose={choose}
        />
      </Sheet>
      <View style={{ flex: 1, flexDirection: wide ? "row" : "column" }}>
        <View style={{ flex: 1 }}>
          <View
            style={{
              width: "100%",
              maxWidth: layout.readingWidth,
              alignSelf: "center",
              paddingHorizontal: layout.gutter,
              paddingTop: 6,
              paddingBottom: 14,
              gap: 12,
            }}
          >
            <View style={styles.between}>
              {wide ? (
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 44,
                  }}
                >
                  <ListChecks size={19} color={palette.primary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: palette.ink,
                    }}
                  >
                    Soru {index + 1} / {exam.question_count}
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Soru listesi"
                  onPress={() => setOverview(true)}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    minHeight: 44,
                  }}
                >
                  <ListChecks size={19} color={palette.primary} />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "700",
                      color: palette.ink,
                    }}
                  >
                    Soru {index + 1} / {exam.question_count}
                  </Text>
                  <ChevronDown size={15} color={palette.muted} />
                </Pressable>
              )}
              {!done && !wide && <TimerBadge seconds={seconds} />}
            </View>
            <View
              accessibilityRole="progressbar"
              accessibilityLabel="Cevaplanan sorular"
              accessibilityValue={{
                min: 0,
                max: exam.question_count,
                now: answered,
              }}
              style={{
                height: 4,
                borderRadius: 2,
                backgroundColor: palette.line,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  height: 4,
                  width: `${(answered / exam.question_count) * 100}%`,
                  backgroundColor: palette.primary,
                  borderRadius: 2,
                }}
              />
            </View>
          </View>
          <ScrollView
            ref={scroll}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[body, { paddingTop: 8 }]}
          >
            <Text style={styles.eyebrow}>DENEMEN DEVAM EDİYOR</Text>
            <Card>
              <Text style={[styles.heading, { fontSize: 21, lineHeight: 32 }]}>
                {row.question.stem}
              </Text>
              <View accessibilityRole="radiogroup" style={{ gap: 10 }}>
                {row.question.options.map((o) => {
                  const selected =
                    submission?.row === row.id
                      ? submission.option === o.id
                      : row.selected_option_id === o.id;
                  const correct =
                    done && row.feedback?.correct_option_id === o.id;
                  return (
                    <Option
                      key={o.id}
                      label={String.fromCharCode(64 + o.position)}
                      text={o.text}
                      selected={selected}
                      correct={Boolean(correct)}
                      incorrect={Boolean(done && selected && !correct)}
                      disabled={locked}
                      onPress={() =>
                        save({
                          row: row.id,
                          option: o.id,
                          revision: exam.revision,
                        })
                      }
                    />
                  );
                })}
              </View>
              {!done && (
                <>
                  <Text style={[styles.muted, { fontSize: 11 }]}>
                    {task.pending
                      ? "Kaydediliyor…"
                      : blocked
                        ? "Kayıt doğrulanmalı"
                        : "Cevaplar sunucuda kayıtlı"}
                  </Text>
                  <Button
                    secondary
                    disabled={locked || row.selected_option_id === null}
                    onPress={() =>
                      save({
                        row: row.id,
                        option: null,
                        revision: exam.revision,
                      })
                    }
                  >
                    Cevabı temizle
                  </Button>
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
              {Boolean(task.error) && (
                <Button
                  secondary
                  disabled={task.pending}
                  onPress={() => {
                    void reconcile();
                  }}
                >
                  Güncel kaydı yükle
                </Button>
              )}
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
            </Card>
          </ScrollView>
          <View
            style={{
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 14),
              backgroundColor: palette.surface,
              borderTopWidth: 1,
              borderColor: palette.line,
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: layout.readingWidth,
                alignSelf: "center",
                paddingHorizontal: layout.gutter,
                gap: 6,
              }}
            >
              <View style={{ flexDirection: "row", gap: 12 }}>
                {[
                  {
                    label: "Önceki soru",
                    text: "Önceki",
                    icon: ArrowLeft,
                    disabled: index === 0 || blocked,
                    go: () => choose(index - 1),
                  },
                  {
                    label: "Sonraki soru",
                    text: "Sonraki",
                    icon: ArrowRight,
                    disabled: index === exam.question_count - 1 || blocked,
                    go: () => choose(index + 1),
                  },
                ].map(({ label, text, icon: Icon, disabled, go }) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    accessibilityLabel={label}
                    accessibilityState={{ disabled }}
                    disabled={disabled}
                    onPress={go}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        flexDirection: "row",
                        minHeight: 48,
                        borderRadius: 14,
                        justifyContent: "center",
                        alignItems: "center",
                        gap: 10,
                        backgroundColor: palette.softPrimary,
                      },
                      disabled && styles.disabled,
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    <Icon size={18} color={palette.primary} />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "700",
                        color: palette.primary,
                      }}
                    >
                      {text}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {!done && !wide && (
                <View style={styles.between}>
                  <Text style={{ fontSize: 11, color: palette.muted }}>
                    {answered} / {exam.question_count} cevaplandı
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Denemeyi bitir"
                    accessibilityState={{ disabled: locked }}
                    disabled={locked}
                    onPress={() => setConfirm(true)}
                    style={{
                      minHeight: 40,
                      justifyContent: "center",
                      opacity: locked ? 0.45 : 1,
                    }}
                  >
                    <Text style={styles.link}>Denemeyi bitir</Text>
                  </Pressable>
                </View>
              )}
            </View>
          </View>
        </View>
        {wide && (
          <ScrollView
            style={{
              width: 320,
              flexGrow: 0,
              backgroundColor: palette.surface,
              borderLeftWidth: 1,
              borderColor: palette.line,
            }}
            contentContainerStyle={{ padding: 20, gap: 16 }}
          >
            {!done && <TimerBadge seconds={seconds} large />}
            <Text accessibilityRole="header" style={styles.heading}>
              Soruların
            </Text>
            <Text style={styles.muted}>
              {answered} / {exam.question_count} cevaplandı
            </Text>
            <QuestionMap
              questions={exam.questions}
              index={index}
              blocked={blocked}
              choose={choose}
            />
            {!done && (
              <Button
                secondary
                disabled={locked}
                onPress={() => setConfirm(true)}
              >
                Denemeyi bitir
              </Button>
            )}
          </ScrollView>
        )}
      </View>
    </View>
  );
}
