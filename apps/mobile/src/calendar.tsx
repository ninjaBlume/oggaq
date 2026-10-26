import { useState } from 'react';
import { Linking, View } from 'react-native';
import { calendarDate, calendarNotice, calendarPhase, calendarStaleNotice, calendarToday, calendarYears, vocabulary } from '@oggaq/study-core';
import { api } from './api';
import { useOnReturn, useResource, useTask } from './hooks';
import { Badge, Button, Card, Columns, EmptyState, ErrorNotice, Loading, ScreenTitle, Sheet, TextLink } from './ui';
import { Text } from './text';
import { useTheme } from './themeContext';

export function ExamCalendarScreen({ initialYear }: { initialYear?: number }) {
  const { styles } = useTheme();
  const current = Number(calendarToday().slice(0, 4));
  const [year, setYear] = useState(initialYear ?? current);const [picking, setPicking] = useState(false);
  const calendar = useResource(signal => api.request('get', '/api/v1/exam-calendar', { signal, query: { year } }), [year]);
  useOnReturn(() => { void calendar.reload(); });
  const link = useTask<void>();const data = calendar.data?.data;
  return <>
    <ScreenTitle title={vocabulary.calendar.title} eyebrow="RESMÎ TAKVİM" subtitle="Temel ve Yenileme sınav tarihleri ile eğitim bitiş günlerini takip et." />
    <Button secondary onPress={() => setPicking(true)}>{`Takvim yılı: ${year}`}</Button>
    <Sheet visible={picking} title="Takvim yılı" close={() => setPicking(false)}>{calendarYears(data, current).map(value => <Button key={value} secondary={year !== value} onPress={() => { setYear(value);setPicking(false); }}>{String(value)}</Button>)}</Sheet>
    {calendar.loading ? <Loading /> : calendar.error || !data ? <ErrorNotice error={calendar.error} retry={() => { void calendar.reload(); }} /> : <>
      {data.status === 'stale' && <Card tone="sand"><Text accessibilityRole="alert" style={styles.text}>{calendarStaleNotice}</Text></Card>}
      {data.entries.length === 0 ? <EmptyState title={`${year} takvimi henüz hazır değil`} message="Doğrulanmış resmî takvim alındığında burada görünecek." /> : <Columns>{data.entries.map(entry => <Card key={`${entry.basic_number}-${entry.renewal_number}`} tone="blue">
        <Text style={styles.eyebrow}>{calendarPhase(entry.exam_date)}</Text><Text accessibilityRole="header" style={styles.heading}>{calendarDate(entry.exam_date)}</Text>
        <View style={styles.row}><Badge>{`${entry.basic_number}. Temel`}</Badge><Badge>{`${entry.renewal_number}. Yenileme`}</Badge></View>
        <Text style={styles.muted}>Eğitim bitişi: {calendarDate(entry.training_deadline)}</Text>
      </Card>)}</Columns>}
      <Card tone="indigo"><Text accessibilityRole="header" style={styles.heading}>Resmî kaynak</Text><Text style={styles.text}>{calendarNotice}</Text>{data.verified_at && <Text style={styles.muted}>Son doğrulama: {new Date(data.verified_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</Text>}<TextLink onPress={() => { void link.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }}>EGM takvimini aç ↗</TextLink><ErrorNotice error={link.error} retry={() => { void link.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }} /></Card>
    </>}
  </>;
}
