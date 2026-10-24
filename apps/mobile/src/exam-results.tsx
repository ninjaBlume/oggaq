import { ExamScorePanel } from "./scoring";
import { FlatList, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttempt, StudyContext } from '@oggaq/shared-types';
import { api } from './api';
import { useEffect, useRef, useState } from 'react';
import { Card, ErrorNotice, Heading, Option, SectionTitle, TextLink } from './ui';
import { Enter, ExpressiveEmblem } from './expressive';
import { useBody, useTheme } from './themeContext';
import { ReportQuestion } from './report';

type Row = ExamAttempt['questions'][number];
type FavoriteState = { pending: boolean; error: unknown; next: boolean };
type Props = { exam: ExamAttempt; context: StudyContext; updateQuestion: (questionId: string, patch: { is_favorite?: boolean; reported?: boolean }) => void; error: unknown; reload: () => void };

// This owns the screen's scroll container. Variable-height question cards are virtualized, never nested in a ScrollView.
export function CompletedExam({ exam, context, updateQuestion, error, reload }: Props) {
  const { styles } = useTheme(); const body = useBody(); const insets = useSafeAreaInsets();
  // Mutation state belongs to the screen, so scrolling a row out of the render window cannot lose its response/error.
  const [favorites, setFavorites] = useState<Record<string, FavoriteState>>({});
  const inFlight = useRef(new Set<string>()); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  async function toggleFavorite(questionId: string, next: boolean) {
    if (inFlight.current.has(questionId)) return;
    inFlight.current.add(questionId);
    setFavorites((old) => ({ ...old, [questionId]: { pending: true, error: null, next } }));
    try {
      const response = await api.request(next ? 'put' : 'delete', '/api/v1/contexts/{context}/favorites/{question}', { params: { context: context.id, question: questionId } });
      if (mounted.current) {
        updateQuestion(response.data.question_id, { is_favorite: response.data.favorite });
        setFavorites((old) => ({ ...old, [questionId]: { pending: false, error: null, next } }));
      }
    } catch (error) {
      if (mounted.current) setFavorites((old) => ({ ...old, [questionId]: { pending: false, error, next } }));
    } finally { inFlight.current.delete(questionId); }
  }
  return <View style={styles.shell}><FlatList
    testID="exam-review-list"
    data={exam.questions}
    keyExtractor={(row) => row.id}
    extraData={favorites}
    contentContainerStyle={[body, { gap: 0, paddingBottom: Math.max(32, insets.bottom + 16) }]}
    initialNumToRender={4}
    maxToRenderPerBatch={4}
    windowSize={5}
    ListHeaderComponent={<View style={{ gap: 20 }}><ResultSummary exam={exam} /><ExamScorePanel exam={exam} contextId={context.id} /><SectionTitle>Cevaplarını incele</SectionTitle><Text style={styles.muted}>{exam.question_count} sorunun tamamı aşağıda. Cevaplarını ve açıklamaları kaydırarak inceleyebilirsin.</Text><ErrorNotice error={error} retry={reload} /></View>}
    renderItem={({ item }) => <ResultQuestion row={item} total={exam.question_count} contextId={context.id} examId={exam.id} updateQuestion={updateQuestion} favorite={favorites[item.question_id]} toggleFavorite={(next) => { void toggleFavorite(item.question_id, next); }} />}
  /></View>;
}
function ResultSummary({ exam }: { exam: ExamAttempt }) {
  const { palette, styles } = useTheme();
  return <><Heading>Deneme sonucun</Heading>{exam.result && <Enter><Card>
    <View style={{ alignItems: 'center', gap: 12, paddingVertical: 10 }}><ExpressiveEmblem size={160}><Text style={{ color: palette.onPrimaryContainer, fontSize: 32, fontWeight: '800', letterSpacing: -1 }}>%{exam.result.score_percent}</Text><Text style={[styles.muted, { color: palette.onPrimaryContainer }]}>doğru oranı</Text></ExpressiveEmblem><Text style={styles.heading}>Bir prova daha tamam!</Text></View>
    <View style={{ flexDirection: 'row', gap: 10 }}>{[{ value: exam.result.correct, label: 'Doğru', color: palette.success, bg: palette.softSuccess }, { value: exam.result.incorrect, label: 'Yanlış', color: palette.red, bg: palette.softRed }, { value: exam.result.blank, label: 'Boş', color: palette.muted, bg: palette.paper }].map((stat) => <View key={stat.label} style={{ flex: 1, alignItems: 'center', padding: 14, backgroundColor: stat.bg, borderRadius: 16, gap: 4 }}><Text style={{ fontSize: 22, fontWeight: '800', color: stat.color }}>{stat.value}</Text><Text style={{ fontSize: 11, fontWeight: '600', color: stat.color }}>{stat.label}</Text></View>)}</View>
    <Text style={[styles.muted, { textAlign: 'center' }]}>{exam.result.correct} doğru · {exam.result.incorrect} yanlış · {exam.result.blank} boş</Text>
    <Text style={[styles.muted, { fontSize: 11, textAlign: 'center' }]}>{exam.finish_reason === 'expired' ? 'Süre dolduğunda tamamlandı.' : 'Denemeyi sen bitirdin.'} Çalışma puanı; geçme / kalma kararı değildir.</Text>
  </Card></Enter>}</>;
}
function ResultQuestion({ row, total, contextId, examId, updateQuestion, favorite, toggleFavorite }: { row: Row; total: number; contextId: string; examId: string; updateQuestion: Props['updateQuestion']; favorite?: FavoriteState; toggleFavorite: (next: boolean) => void }) {
  const { palette, styles } = useTheme();
  const feedback = row.feedback; const color = feedback?.outcome === 'correct' ? palette.success : feedback?.outcome === 'incorrect' ? palette.red : palette.muted;
  return <View testID={`result-question-${row.position}`} style={{ marginTop: 18 }}><Card>
    <View style={styles.between}><Text style={styles.muted}>Soru {row.position} / {total}</Text><Text style={{ color, fontWeight: '700' }}>{feedback?.outcome === 'correct' ? 'Doğru' : feedback?.outcome === 'incorrect' ? 'Yanlış' : 'Boş bırakıldı'}</Text></View>
    <Text accessibilityRole="header" style={[styles.heading, { fontSize: 21, lineHeight: 32 }]}>{row.question.stem}</Text>
    <View accessibilityRole="radiogroup" accessibilityLabel={`${row.position}. sorunun cevap seçenekleri`} style={{ gap: 10 }}>{row.question.options.map((option) => {
      const selected = row.selected_option_id === option.id; const correct = feedback?.correct_option_id === option.id;
      return <View key={option.id} style={{ gap: 4 }}><Option label={String.fromCharCode(64 + option.position)} text={option.text} selected={selected} correct={correct} incorrect={selected && !correct} disabled onPress={() => {}} />{selected && <Text style={{ color: correct ? palette.success : palette.red, fontSize: 12, fontWeight: '600' }}>Senin cevabın</Text>}</View>;
    })}</View>
    {feedback?.explanation && <View style={{ padding: 16, borderRadius: 16, backgroundColor: palette.surfaceContainer, gap: 8 }}><Text style={{ color: palette.ink, fontWeight: '700' }}>Açıklama</Text><Text style={styles.text}>{feedback.explanation}</Text></View>}
    <TextLink disabled={favorite?.pending} onPress={() => toggleFavorite(!row.is_favorite)}>{row.is_favorite ? '★ Favorilerde' : '☆ Favoriye ekle'}</TextLink><ErrorNotice error={favorite?.error} retry={() => toggleFavorite(favorite?.next ?? !row.is_favorite)} />
    <ReportQuestion contextId={contextId} examId={examId} row={row} reported={(id) => updateQuestion(id, { reported: true })} />
  </Card></View>;
}
