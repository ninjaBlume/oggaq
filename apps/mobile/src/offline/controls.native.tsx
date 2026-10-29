import { useState } from 'react';
import { View } from 'react-native';
import type { StudyContext, User } from '@oggaq/shared-types';
import { examQuestionTitle, suggestedMinutes } from '@oggaq/study-core';
import { Text } from '../text';
import { useOnReturn, useResource, useTask } from '../hooks';
import { newId } from '../ids';
import { Button, ErrorNotice, SectionTitle, Sheet } from '../ui';
import { ChoiceGroup } from '../expressive';
import { useTheme } from '../themeContext';
import { cardTone } from '@oggaq/design-tokens';
import { shape } from '../theme';
import { openOfflineDatabase } from './nativeDatabase';
import { startLocalAttempt } from './attempts';
import type { ExamPackage } from './package';
type PackageSummary = { package_id: string; exam: ExamPackage['exam'] };

export function OfflineShelf({ user, context, kind, education, weapon, revision, open, onlyPending, onlineActiveIds }: { user: User; context: StudyContext; onlyPending: boolean; onlineActiveIds: string[]; kind: 'deneme' | 'ders'; education: 'basic' | 'renewal'; weapon: 'armed' | 'unarmed'; revision: number; open: (id: string) => void }) {
  const { styles, palette } = useTheme();
  const tint = cardTone(palette, kind === 'ders' ? 'indigo' : 'blue');
  const owner = { userId: user.id, contextId: context.id };
  const [chosen, setChosen] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [choosingSubject, setChoosingSubject] = useState(false);
  const [policy, setPolicy] = useState<'continuous' | 'pause_on_exit'>('continuous');
  const task = useTask<string>();
  const resource = useResource(async () => {
    const db = await openOfflineDatabase();
    const [packs, attempts] = await Promise.all([db.packageSummaries(owner), db.attemptSummaries(owner)]);
    return { packs: packs.map(row => ({ package_id: row.id, exam: JSON.parse(row.exam) as ExamPackage['exam'] })), attempts };
  }, [user.id, context.id, revision, onlyPending], context.kind === 'personal');
  useOnReturn(() => void resource.reload(false));
  if (context.kind !== 'personal') return null;
  const seen = new Set<string>();
  const allPacks = resource.data?.packs ?? [];
  const candidates = allPacks.filter(pack => {
    const latest = !seen.has(pack.exam.id); seen.add(pack.exam.id);
    return latest || (resource.data?.attempts ?? []).some(row => row.packageId === pack.package_id);
  }).filter(pack => (pack.exam.subject === null) === (kind === 'deneme')
    && pack.exam.education_type === education && (kind === 'ders' || pack.exam.weapon_status === weapon));
  const visibleCandidates = candidates.filter(pack => !onlyPending || (resource.data?.attempts ?? []).some(row => row.packageId === pack.package_id));
  const subjects = Array.from(new Map(visibleCandidates.flatMap(pack => pack.exam.subject ? [[pack.exam.subject.id, pack.exam.subject] as const] : [])).values());
  const selectedSubject = subjects.find(item => item.id === subject) ?? subjects[0];
  const packs = visibleCandidates.filter(pack => kind !== 'ders' || pack.exam.subject?.id === selectedSubject?.id)
    .sort((a, b) => b.exam.year - a.exam.year || (Number(b.exam.exam_number) || 0) - (Number(a.exam.exam_number) || 0));

  if (!packs.length && !resource.error) return onlyPending ? null : <Text style={styles.muted}>{resource.loading ? 'Cihazdaki sınavlar açılıyor…' : 'Bu seçimde henüz cihazda hazır sınav yok. İnternete bağlanıp hazırlığın ilerlemesini bekle.'}</Text>;
  function begin(pack: PackageSummary) {
    const id = newId();
    void task.run(async () => {
      const db = await openOfflineDatabase();
      await startLocalAttempt(db, owner, pack.package_id, id, newId(), suggestedMinutes(pack.exam) * 60, Date.now(), policy);
      return id;
    }, open);
  }
  return <View style={{ gap: 8 }}><SectionTitle>{onlyPending ? 'Devam eden çalışmalar' : 'Sınavlar'}</SectionTitle>
    <Text style={styles.muted}>Bu cihazda internet olmadan çözebilirsin.</Text>
    {kind === 'ders' && subjects.length > 1 && <>
      <Button compact secondary onPress={() => setChoosingSubject(true)}>{selectedSubject?.name ?? 'Ders seç'}</Button>
      <Sheet visible={choosingSubject} title="Hangi dersin sınavları?" close={() => setChoosingSubject(false)}>
        {subjects.map(item => <Button key={item.id} secondary={item.id !== selectedSubject?.id} alignStart onPress={() => { setSubject(item.id); setChoosingSubject(false); }}>{item.name}</Button>)}
      </Sheet>
    </>}
    <ErrorNotice error={resource.error ?? task.error} />
    {packs.map(pack => {
      const attempts = (resource.data?.attempts ?? []).filter(row => row.packageId === pack.package_id);
      const current = attempts.find(row => row.state === 'active');
      const waiting = attempts.filter(row => row.state === 'completed' && row.pending);
      return <View key={pack.package_id} style={{ gap: 6, paddingVertical: 6, paddingHorizontal: 12, borderRadius: shape.control, backgroundColor: tint.surface, borderWidth: 1, borderColor: tint.line }}>
        <Text style={styles.heading}>{examQuestionTitle(pack.exam)}</Text>
        <Text style={styles.muted}>{pack.exam.question_count} soru · {suggestedMinutes(pack.exam)} dk</Text>
        {current ? <Button compact onPress={() => open(current.id)}>Devam et</Button> : onlineActiveIds.includes(pack.exam.id) ? <Text style={styles.muted}>Bu sınav çevrimiçi başlamış. Devam etmek için bağlantı gerekiyor.</Text> : chosen === pack.package_id ? <>
          <ChoiceGroup choices={[{ value: 'continuous', label: 'Süre devam etsin', accessibilityLabel: 'Süre devam etsin' }, { value: 'pause_on_exit', label: 'Çıkınca süre dursun', accessibilityLabel: 'Çıkınca süre dursun' }]} value={policy} onChange={value => setPolicy(value as typeof policy)} />
          <Button compact disabled={task.pending} onPress={() => begin(pack)}>Sınavı başlat</Button>
        </> : <Button compact secondary onPress={() => setChosen(pack.package_id)}>Sınava gir</Button>}
        {waiting.map(row => <Button key={row.id} compact secondary onPress={() => open(row.id)}>{`Eşitlemeyi bekliyor · ${pack.exam.question_count} soru`}</Button>)}
      </View>;
    })}
  </View>;
}
