import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { AppState, FlatList, Pressable, ScrollView, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StudyContext, User } from '@oggaq/shared-types';
import { examQuestionTitle, timeLabel } from '@oggaq/study-core';
import { Text } from '../text';
import { api } from '../api';
import { session } from '../storage';
import { newId } from '../ids';
import { useResource, useTask } from '../hooks';
import { Button, Card, ConfirmDialog, ErrorNotice, Loading, Option } from '../ui';
import { useBody, useTheme } from '../themeContext';
import { openOfflineDatabase } from './nativeDatabase';
import { answerLocalAttempt, checkpointLocalAttempt, finishLocalAttempt, openLocalAttempt, positionLocalAttempt, timerLocalAttempt, type LocalAttempt } from './attempts';
import { observeOfflineExam, offlineCounts } from './exam';
import { importCompletedAttempt } from './importCompleted';
import type { ExamPackage } from './package';

export function OfflineExamScreen({ user, context, id, openSynced }: { user: User; context: StudyContext; id: string; openSynced: (id: string) => void }) {
  const owner = { userId: user.id, contextId: context.id };
  const navigation = useNavigation();
  const { styles, palette } = useTheme();
  const body = useBody();
  const [now, setNow] = useState(Date.now());
  const [confirm, setConfirm] = useState(false);
  const [lifecycleError, setLifecycleError] = useState<unknown>(null);
  const task = useTask<LocalAttempt>();
  const sync = useTask<string>();
  const saving = useRef(false);
  saving.current = task.pending;
  const latest = useRef<LocalAttempt | null>(null);
  const resource = useResource(async () => {
    const db = await openOfflineDatabase();
    const row = await db.attempt(owner, id);
    if (!row) throw new Error('Bu hesapta çevrimdışı sınav bulunamadı.');
    const raw = await db.package(owner, row.packageId);
    if (!raw) throw new Error('İndirilmiş sınav paketi bulunamadı.');
    const state = await openLocalAttempt(db, owner, id, Date.now());
    latest.current = state;
    return { pack: JSON.parse(raw) as ExamPackage, state };
  }, [user.id, context.id, id], context.kind === 'personal', { manageResume: false });
  const value = resource.data;
  useLayoutEffect(() => { if (value) navigation.setOptions({ title: examQuestionTitle(value.pack.exam) }); }, [navigation, value?.pack.exam]);
  const state = value?.state;
  const current = state ? observeOfflineExam(state.exam, now) : null;
  const seconds = current ? Math.ceil(current.remainingMs / 1000) : 0;
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      const state = latest.current;
      if (AppState.currentState !== 'active' || saving.current || !state || state.exam.finished || state.timerPolicy !== 'pause_on_exit' || state.exam.runningSince === null) return;
      void openOfflineDatabase().then(db => checkpointLocalAttempt(db, owner, id, Date.now())).catch(error => {
        if (!latest.current?.exam.finished) setLifecycleError(error);
      });
    }, 15000);
    return () => clearInterval(timer);
  }, [user.id, context.id, id]);
  function accept(next: LocalAttempt) { latest.current = next; resource.setData(previous => previous ? { ...previous, state: next } : previous); setNow(Date.now()); }
  function changeTimer(action: 'pause' | 'resume') {
    void task.run(async () => timerLocalAttempt(await openOfflineDatabase(), owner, id, newId(), action, Date.now()), accept);
  }
  useEffect(() => {
    const subscription = AppState.addEventListener('change', next => {
      const currentState = latest.current;
      if (next !== 'active' && currentState && !currentState.exam.finished && currentState.timerPolicy === 'pause_on_exit' && currentState.exam.runningSince !== null) {
        void openOfflineDatabase().then(db => timerLocalAttempt(db, owner, id, newId(), 'pause', Date.now())).then(accept).catch(setLifecycleError);
      }
    });
    return () => subscription.remove();
  }, [user.id, context.id, id]);
  useEffect(() => navigation.addListener('beforeRemove', event => {
    const s = latest.current;
    if (saving.current) { event.preventDefault(); setLifecycleError(new Error('Kayıt tamamlanınca ekrandan çıkabilirsin.')); return; }
    if (!s || s.exam.finished || s.timerPolicy !== 'pause_on_exit' || s.exam.runningSince === null) return;
    event.preventDefault();
    void openOfflineDatabase().then(db => observeOfflineExam(s.exam, Date.now()).finished
      ? finishLocalAttempt(db, owner, id, newId(), Date.now())
      : timerLocalAttempt(db, owner, id, newId(), 'pause', Date.now())).then(next => {
      latest.current = next;
      navigation.dispatch(event.data.action);
    }).catch(setLifecycleError);
  }), [navigation, user.id, context.id, id]);
  function finish() {
    setConfirm(false);
    void task.run(async () => finishLocalAttempt(await openOfflineDatabase(), owner, id, newId(), Date.now()), accept);
  }
  useEffect(() => {
    if (state && !state.exam.finished && current?.finished && !task.pending && !task.error) finish();
  }, [state, current?.finished, task.pending, task.error]);
  if (!value || !state || !current) return resource.error ? <ErrorNotice error={resource.error} retry={() => void resource.reload(false)} /> : <Loading />;
  const row = value.pack.questions[state.position - 1];
  if (!row) return <ErrorNotice error={new Error('Sınav sorusu bulunamadı.')} />;
  const selection = state.exam.answers[row.question_id];
  const counts = offlineCounts(state.exam);
  function go(position: number) {
    void task.run(async () => positionLocalAttempt(await openOfflineDatabase(), owner, id, newId(), position), accept);
  }
  function synchronize() {
    const token = session.token;
    if (!token) return;
    void sync.run(async () => {
      const db = await openOfflineDatabase();
      const result = await importCompletedAttempt(db, owner, id, () => session.token === token, body => api.request('post', '/api/v1/contexts/{context}/offline-exam-imports', { params: { context: context.id }, body }));
      return result.id;
    }, openSynced);
  }
  if (state.exam.finished) return <FlatList style={styles.shell} contentContainerStyle={body} data={value.pack.questions} keyExtractor={item => item.question_id}
    ListHeaderComponent={<><Text style={styles.heading}>{examQuestionTitle(value.pack.exam)}</Text><Card>
      <Text style={styles.heading}>Sınav sonucu</Text>
      <Text style={styles.text}>{`${counts.correct} doğru · ${counts.incorrect} yanlış · ${counts.blank} boş`}</Text>
      <Text style={styles.muted}>Sonuç cihazda kayıtlı. İnternet geldiğinde otomatik eşitlenir.</Text>
      <Button disabled={sync.pending} onPress={synchronize}>{sync.pending ? 'Eşitleniyor…' : 'Sonucu eşitle'}</Button>
      <ErrorNotice error={sync.error} retry={synchronize} />
    </Card><Text style={styles.heading}>Cevaplarını incele</Text></>}
    renderItem={({ item, index }) => {
      const picked = state.exam.answers[item.question_id];
      return <Card><Text style={styles.muted}>{`Soru ${index + 1} / ${value.pack.questions.length} · ${picked === undefined ? 'Boş' : picked === item.correct_option_id ? 'Doğru' : 'Yanlış'}`}</Text>
        <Text style={styles.heading}>{item.question.stem}</Text><View style={{ gap: 6 }}>{item.question.options.map(option => <Option key={option.id}
          label={String.fromCharCode(64 + option.position)} text={option.text} selected={picked === option.id} correct={option.id === item.correct_option_id}
          incorrect={picked === option.id && option.id !== item.correct_option_id} disabled onPress={() => {}} />)}</View>
        {item.explanation && <Text style={styles.text}>{item.explanation}</Text>}
      </Card>;
    }} />;
  return <ScrollView style={styles.shell} contentContainerStyle={body}>
    <Text style={styles.heading}>{examQuestionTitle(value.pack.exam)}</Text>
    <ErrorNotice error={resource.error ?? task.error ?? lifecycleError} retry={current.finished && !state.exam.finished ? finish : undefined} />
    <>
      <View style={styles.between}><Text style={styles.heading}>{`Soru ${state.position} / ${state.exam.questions.length}`}</Text><Text style={styles.heading}>{timeLabel(seconds)}</Text></View>
      {state.timerPolicy === 'pause_on_exit' && <Button secondary disabled={task.pending} onPress={() => changeTimer(state.exam.runningSince === null ? 'resume' : 'pause')}>{state.exam.runningSince === null ? 'Süreyi devam ettir' : 'Süreyi duraklat'}</Button>}
      <Card><Text style={styles.heading}>{row.question.stem}</Text><View style={{ gap: 10 }}>
        {row.question.options.map(option => <Option key={option.id} label={String.fromCharCode(64 + option.position)} text={option.text}
          selected={selection === option.id} correct={selection !== undefined && option.id === row.correct_option_id}
          incorrect={selection === option.id && option.id !== row.correct_option_id}
          disabled={task.pending || selection !== undefined || seconds === 0 || state.exam.runningSince === null}
          onPress={() => void task.run(async () => answerLocalAttempt(await openOfflineDatabase(), owner, id, newId(), row.question_id, option.id, Date.now()), accept)} />)}
      </View>{selection !== undefined && <Text style={styles.text}>{selection === row.correct_option_id ? 'Doğru yanıt.' : 'Yanlış yanıt.'} Yanıtın kaydedildi ve kilitlendi.</Text>}</Card>
      <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>{value.pack.questions.map((question, index) => {
        const answer = state.exam.answers[question.question_id];
        const color = answer === undefined ? palette.muted : answer === question.correct_option_id ? palette.success : palette.red;
        return <Pressable key={question.question_id} accessibilityRole="button" accessibilityLabel={`${index + 1}. soru`} disabled={task.pending} onPress={() => go(index + 1)} style={{ padding: 8, borderWidth: 1, borderColor: index + 1 === state.position ? palette.primary : palette.line, borderRadius: 8 }}><Text style={{ color }}>{index + 1}{answer === undefined ? '' : answer === question.correct_option_id ? ' ✓' : ' ×'}</Text></Pressable>;
      })}</View>
      <View style={{ flexDirection: 'row', gap: 8 }}><Button compact secondary disabled={task.pending || state.position === 1} onPress={() => go(state.position - 1)}>Önceki</Button><Button compact secondary disabled={task.pending || state.position === state.exam.questions.length} onPress={() => go(state.position + 1)}>Sonraki</Button></View>
      <Button secondary disabled={task.pending || seconds === 0 || state.exam.runningSince === null} onPress={() => setConfirm(true)}>Sınavı bitir</Button>
      <ConfirmDialog visible={confirm} title="Sınavı bitir" message={`${counts.blank} soru boş. Sınavı bitirmek istiyor musun?`} confirmLabel="Bitir" confirm={finish} cancel={() => setConfirm(false)} />
    </>
  </ScrollView>;
}
