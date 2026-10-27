import { Text } from "./text";
import { ExamScorePanel } from "./scoring";
import { FlatList, View } from "react-native";
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ExamAttempt, StudyContext } from '@oggaq/shared-types';
import { api } from './api';
import { useEffect, useRef, useState } from 'react';
import { Card, ErrorNotice, Heading, Option, SectionTitle, SplitBar, TextLink } from './ui';
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
    ListHeaderComponent={<View style={{ gap: 12 }}><ResultSummary exam={exam} /><ExamScorePanel exam={exam} contextId={context.id} /><View style={{ gap: 4 }}><SectionTitle>Cevaplarını incele</SectionTitle><Text style={styles.muted}>{exam.question_count} sorunun tamamı aşağıda. Cevaplarını ve açıklamaları kaydırarak inceleyebilirsin.</Text></View><ErrorNotice error={error} retry={reload} read retained /></View>}
    renderItem={({ item }) => <ResultQuestion row={item} total={exam.question_count} contextId={context.id} examId={exam.id} updateQuestion={updateQuestion} favorite={favorites[item.question_id]} toggleFavorite={(next) => { void toggleFavorite(item.question_id, next); }} />}
  /></View>;
}
function ResultSummary({ exam }: { exam: ExamAttempt }) {
  const { palette, styles } = useTheme();
  const result = exam.result;
  return <><Heading>Deneme sonucun</Heading>{result && <>
    <View testID="exam-result-summary"><Card compact tone="blue">
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[styles.text, { fontWeight: '600' }]}>Doğru oranı</Text>
          <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>{exam.question_count} soru</Text>
        </View>
        <Text testID="exam-result-ratio" style={{ color: palette.primary, fontSize: 32, lineHeight: 40, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{`%${result.score_percent.toLocaleString('tr-TR', { maximumFractionDigits: 4 })}`}</Text>
      </View>
      <SplitBar correct={result.correct} incorrect={result.incorrect} blank={result.blank} height={4} />
      <View style={{ flexDirection: 'row', gap: 12, paddingTop: 2 }}>
        {[
          { key: 'correct', value: result.correct, label: 'Doğru', color: palette.success },
          { key: 'incorrect', value: result.incorrect, label: 'Yanlış', color: palette.red },
          { key: 'blank', value: result.blank, label: 'Boş', color: palette.muted },
        ].map(stat => <View key={stat.key} testID={`exam-result-${stat.key}`} style={{ flex: 1, minWidth: 0, gap: 1 }}>
          <Text style={{ fontSize: 22, lineHeight: 28, fontWeight: '700', color: stat.color, fontVariant: ['tabular-nums'] }}>{stat.value}</Text>
          <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>{stat.label}</Text>
        </View>)}
      </View>
    </Card></View>
    <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>{exam.finish_reason === 'expired' ? 'Süre dolduğunda tamamlandı.' : 'Denemeyi sen bitirdin.'} Çalışma puanı; geçme / kalma kararı değildir.</Text>
  </>}</>;
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
