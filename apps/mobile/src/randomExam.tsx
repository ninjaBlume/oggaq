import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import type { ExamAttempt, StudyContext, components } from "@oggaq/shared-types";
import { ApiError } from "@oggaq/api-client";
import { examTimerChoices, timeLabel, vocabulary, type ExamTimerPolicy } from "@oggaq/study-core";
import { api } from "./api";
import { newId } from "./ids";
import { ChoiceGroup } from "./expressive";
import { useOnReturn, useResource, useTask } from "./hooks";
import { useTheme } from "./themeContext";
import { Text } from "./text";
import { Button, Card, ErrorNotice, Field, Loading, ReadNotice, ScreenTitle } from "./ui";

type Input = components["schemas"]["StartRandomExamInput"];
const modes = [
  { value: "armed", label: "Silahlı", count: 125, minutes: 150 },
  { value: "unarmed", label: "Silahsız", count: 100, minutes: 120 },
  { value: "weapon_difference", label: "Silah farkı", count: 25, minutes: 30 },
] as const;

export function RandomExam({ context, openExam }: { context: StudyContext; openExam: (id: string, initialExam?: ExamAttempt) => void }) {
  const { styles } = useTheme();
  const current = useResource(signal => api.request("get", "/api/v1/contexts/{context}/random-exam", { params: { context: context.id }, signal }), [context.id]);
  useOnReturn(() => { void current.reload(); });
  const opened = useRef(false);
  const active = current.data?.data;
  useEffect(() => {
    if (active && !opened.current) { opened.current = true; openExam(active.id); }
  }, [active?.id, openExam]);
  const [education, setEducation] = useState<Input["education_type"]>("basic");
  const [weapon, setWeapon] = useState<Input["weapon_status"]>("armed");
  const [minutes, setMinutes] = useState("150");
  const [timerPolicy, setTimerPolicy] = useState<ExamTimerPolicy>("continuous");
  const task = useTask<{ data: ExamAttempt }>();
  const operation = useRef<Input | null>(null);
  useEffect(() => {
    if (task.error instanceof ApiError && [409, 422, 503].includes(task.error.status)) operation.current = null;
  }, [task.error]);
  const rejected = task.error instanceof ApiError && [409, 422, 503].includes(task.error.status);
  const locked = task.pending || (operation.current !== null && !rejected);
  const mode = modes.find(item => item.value === weapon)!;
  function begin() {
    operation.current ??= { id: newId(), education_type: education, weapon_status: weapon, duration_seconds: Math.round(Number(minutes)) * 60, timer_policy: timerPolicy };
    void task.run(() => api.request("post", "/api/v1/contexts/{context}/random-exam", { params: { context: context.id }, body: operation.current! }), response => {
      operation.current = null;
      current.setData(response);
      opened.current = true;
      openExam(response.data.id, response.data);
    });
  }
  return <>
    <ScreenTitle title={vocabulary.random.title} subtitle="Çıkmış sorulardan, ders ve konu dağılımı korunarak hazırlanan bir sınav çöz." />
    {current.loading && !current.data ? <Loading label="Rastgele sınavın kontrol ediliyor" /> : current.error || !current.data ? <ReadNotice resource={current} /> : active ? <Card tone="blue">
      <Text style={styles.heading}>{active.random_exam?.title ?? vocabulary.random.title}</Text>
      <Text style={styles.muted}>{active.question_count} soru · {active.timer_paused ? "Süre duraklatıldı" : `Kalan süre ${timeLabel(active.remaining_seconds)}`}</Text>
      <Text style={styles.muted}>Bu sınav bitmeden yeni rastgele sınav oluşturulmaz.</Text>
      <Button onPress={() => openExam(active.id)}>Rastgele sınavına devam et</Button>
    </Card> : <Card tone="blue">
      <ChoiceGroup choices={[{ value: "basic", label: "Temel eğitim", accessibilityLabel: "Temel eğitim" }, { value: "renewal", label: "Yenileme eğitimi", accessibilityLabel: "Yenileme eğitimi" }]} value={education} disabled={locked} onChange={value => setEducation(value as Input["education_type"])} />
      <ChoiceGroup choices={modes.map(item => ({ ...item, accessibilityLabel: item.label }))} value={weapon} disabled={locked} onChange={value => { const next = modes.find(item => item.value === value)!; setWeapon(next.value); setMinutes(String(next.minutes)); }} />
      <Text style={styles.text}>{mode.count} soru{weapon === "armed" ? " · 100 genel bilgi + 25 silah bilgisi" : weapon === "weapon_difference" ? " · Yalnız silah bilgisi" : " · Genel bilgi"}</Text>
      <Text style={styles.muted}>Son yayımlanmış tam sınavın ders ve konu dağılımı kullanılır. Sorular bir kez seçilir; çıkıp geri geldiğinde aynı sınava devam edersin.</Text>
      <View style={{ gap: 10 }}>
        <Field label="Süre (dakika)" numeric value={minutes} onChange={setMinutes} editable={!locked} />
        <ChoiceGroup choices={examTimerChoices.map(item => ({ ...item, accessibilityLabel: item.label }))} value={timerPolicy} disabled={locked} onChange={value => setTimerPolicy(value as ExamTimerPolicy)} />
        {timerPolicy === "pause_on_exit" && <Text style={styles.muted}>Normal çıkışta süre durur. Ani kapanma veya bağlantı kaybında 30 saniyeye kadar işlemeye devam edebilir.</Text>}
      </View>
      <Text style={styles.muted}>Bitirdiğinde veya süre dolduğunda, boş sorular kalsa da yeni sınav oluşturabilirsin.</Text>
      <Button disabled={locked || !Number.isFinite(Number(minutes)) || Number(minutes) < 1 || Number(minutes) > 180} onPress={begin}>{task.pending ? "Sınav hazırlanıyor…" : "Rastgele sınav oluştur"}</Button>
      <ErrorNotice error={task.error} retry={begin} />
    </Card>}
  </>;
}
