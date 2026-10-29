import { useState } from 'react';
import { View } from 'react-native';
import type { StudyContext, User } from '@oggaq/shared-types';
import { examQuestionTitle, suggestedMinutes } from '@oggaq/study-core';
import { Text } from '../text';
import { useOnReturn, useResource, useTask } from '../hooks';
import { newId } from '../ids';
import { Button, Card, ErrorNotice, SectionTitle } from '../ui';
import { ChoiceGroup } from '../expressive';
import { useTheme } from '../themeContext';
import { downloadOfflineExam } from './download';
import { openOfflineDatabase } from './nativeDatabase';
import { startLocalAttempt } from './attempts';
import type { ExamPackage } from './package';
import type { Props } from './controls';

export function OfflineDownload({ user, context, exam, changed }: Props) {
  const task = useTask<void>();
  if (context.kind !== 'personal') return null;
  return <View style={{ gap: 4 }}><Button compact secondary disabled={task.pending} onPress={() => void task.run(
    () => downloadOfflineExam({ userId: user.id, contextId: context.id }, exam.id), changed,
  )}>{task.pending ? 'İndiriliyor…' : 'Çevrimdışı indir'}</Button><ErrorNotice error={task.error} /></View>;
}

export function OfflineShelf({ user, context, kind, education, weapon, revision, open }: { user: User; context: StudyContext; kind: 'deneme' | 'ders'; education: 'basic' | 'renewal'; weapon: 'armed' | 'unarmed'; revision: number; open: (id: string) => void }) {
  const { styles } = useTheme();
  const owner = { userId: user.id, contextId: context.id };
  const [chosen, setChosen] = useState<string | null>(null);
  const [policy, setPolicy] = useState<'continuous' | 'pause_on_exit'>('continuous');
  const task = useTask<string>();
  const resource = useResource(async () => {
    const db = await openOfflineDatabase();
    const [packs, attempts] = await Promise.all([db.packages(owner), db.attemptSummaries(owner)]);
    return { packs: packs.map(row => JSON.parse(row.manifest) as ExamPackage), attempts };
  }, [user.id, context.id, revision], context.kind === 'personal');
  useOnReturn(() => void resource.reload(false));
  if (context.kind !== 'personal') return null;
  const packs = (resource.data?.packs ?? []).filter(pack => (pack.exam.subject === null) === (kind === 'deneme')
    && pack.exam.education_type === education && (kind === 'ders' || pack.exam.weapon_status === weapon));
  if (!packs.length && !resource.error) return null;
  function begin(pack: ExamPackage) {
    const id = newId();
    void task.run(async () => {
      const db = await openOfflineDatabase();
      await startLocalAttempt(db, owner, pack.package_id, id, newId(), suggestedMinutes(pack.exam) * 60, Date.now(), policy);
      return id;
    }, open);
  }
  return <Card compact tone="blue"><SectionTitle>İndirilen sınavlar</SectionTitle>
    <Text style={styles.muted}>Bu cihazda internet olmadan çözebilirsin.</Text>
    <ErrorNotice error={resource.error ?? task.error} />
    {packs.map(pack => {
      const attempts = (resource.data?.attempts ?? []).filter(row => row.packageId === pack.package_id);
      const current = attempts.find(row => row.state === 'active');
      const waiting = attempts.filter(row => row.state === 'completed' && row.pending);
      return <View key={pack.package_id} style={{ gap: 6, paddingVertical: 6 }}>
        <Text style={styles.heading}>{examQuestionTitle(pack.exam)}</Text>
        {current ? <Button compact onPress={() => open(current.id)}>Devam et</Button> : chosen === pack.package_id ? <>
          <ChoiceGroup choices={[{ value: 'continuous', label: 'Süre devam etsin', accessibilityLabel: 'Süre devam etsin' }, { value: 'pause_on_exit', label: 'Çıkınca süre dursun', accessibilityLabel: 'Çıkınca süre dursun' }]} value={policy} onChange={value => setPolicy(value as typeof policy)} />
          <Button compact disabled={task.pending} onPress={() => begin(pack)}>Sınavı başlat</Button>
        </> : <Button compact secondary onPress={() => setChosen(pack.package_id)}>Çevrimdışı çöz</Button>}
        {waiting.map(row => <Button key={row.id} compact secondary onPress={() => open(row.id)}>{`Eşitlemeyi bekliyor · ${pack.questions.length} soru`}</Button>)}
      </View>;
    })}
  </Card>;
}
