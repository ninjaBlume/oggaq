import { useState } from 'react';
import { Linking, View } from 'react-native';
import { calendarDate, calendarDaysRemaining, calendarNotice, calendarRules, calendarStaleNotice, calendarToday, calendarYears, orderedCalendarEntries, upcomingCountdown } from '@oggaq/study-core';
import { api } from './api';
import { useOnReturn, useResource, useTask } from './hooks';
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ExternalLink, GraduationCap, ShieldCheck } from './icons';
import { Badge, Button, Card, Columns, EmptyState, ErrorNotice, IconButton, Loading, Sheet, TextLink } from './ui';
import { Text } from './text';
import { useTheme } from './themeContext';

const ruleIcons = { unarmed: BookOpen, armed: ShieldCheck, shooting: CheckCircle2, renewal: GraduationCap };

export function ExamCalendarScreen({ initialYear, back }: { initialYear?: number; back: () => void }) {
  const { styles, palette } = useTheme();
  const today = calendarToday();const current = Number(today.slice(0, 4));
  const [year, setYear] = useState(initialYear ?? current);const [picking, setPicking] = useState(false);
  const calendar = useResource(signal => api.request('get', '/api/v1/exam-calendar', { signal, query: { year } }), [year]);
  useOnReturn(() => { void calendar.reload(); });
  const link = useTask<void>();const sourceLink = useTask<void>();const data = calendar.data?.data;
  const entries = orderedCalendarEntries(data?.entries ?? [], today);
  const openSource = (url: string) => { void link.run(async () => { await Linking.openURL(url); }, () => {}); };
  return <>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconButton icon={ArrowLeft} label="Ana sayfaya dön" onPress={back} />
      <View style={{ flex: 1, gap: 4 }}><Text accessibilityRole="header" style={[styles.heading, { fontSize: 23, lineHeight: 30 }]}>Sınav tarihleri ve kurallar</Text><Text style={styles.muted}>Hazırlığını resmî takvime göre planla.</Text></View>
    </View>
    <Card tone="indigo">
      <View testID="calendar-rules" style={{ gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ padding: 10, borderRadius: 14, backgroundColor: palette.softPrimary }}><ShieldCheck size={24} color={palette.primary} /></View>
          <Text accessibilityRole="header" style={[styles.heading, { flex: 1 }]}>{calendarRules.title}</Text>
        </View>
        <Columns>{calendarRules.items.map(rule => {
          const Icon = ruleIcons[rule.id];
          return <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 3 }}>
            <Icon size={20} color={palette.primary} style={{ marginTop: 2 }} />
            <View style={{ flex: 1, gap: 3 }}><Text style={[styles.text, { fontWeight: '700' }]}>{rule.title}</Text><Text style={styles.text}>{rule.text}</Text></View>
          </View>;
        })}</Columns>
        <Text style={styles.muted}>{calendarRules.note}</Text>
        <Button icon={ExternalLink} onPress={() => openSource(calendarRules.sourceUrl)}>Resmî EGM sayfası</Button>
        <TextLink onPress={() => openSource(calendarRules.regulationUrl)}>Güncel yönetmeliği incele ↗</TextLink>
        <ErrorNotice error={link.error} />
      </View>
    </Card>
    <View style={{ gap: 10 }}>
      <Text accessibilityRole="header" style={styles.heading}>Sınav takvimi ve eğitim bitişleri</Text>
      <Button secondary compact onPress={() => setPicking(true)}>{`Takvim yılı: ${year}`}</Button>
    </View>
    <Sheet visible={picking} title="Takvim yılı" close={() => setPicking(false)}>{calendarYears(data, current).map(value => <Button key={value} secondary={year !== value} onPress={() => { setYear(value);setPicking(false); }}>{String(value)}</Button>)}</Sheet>
    {calendar.loading ? <Loading /> : calendar.error || !data ? <ErrorNotice error={calendar.error} retry={() => { void calendar.reload(); }} /> : <>
      {data.status === 'stale' && <Card tone="sand"><Text accessibilityRole="alert" style={styles.text}>{calendarStaleNotice}</Text></Card>}
      {entries.length === 0 ? <EmptyState title={`${year} takvimi henüz hazır değil`} message="Doğrulanmış resmî takvim alındığında burada görünecek." /> : <Columns>{entries.map((entry, index) => {
        const days = calendarDaysRemaining(entry.exam_date, today);const next = index === 0 && days !== null;
        return <Card key={`${entry.basic_number}-${entry.renewal_number}`} tone={next ? 'blue' : undefined}>
          <View testID="calendar-entry" style={{ gap: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: palette.softPrimary, borderRadius: 12, padding: 9 }}><CalendarDays size={22} color={palette.primary} /></View>
              <View style={{ flex: 1, minWidth: 140, gap: 4 }}>
                <Text style={[styles.eyebrow, { color: next ? palette.primary : palette.muted }]}>{next ? 'Sıradaki sınav' : days === null ? 'Geçmiş sınav' : 'Yaklaşan sınav'}</Text>
                <Text accessibilityRole="header" style={[styles.text, { fontWeight: '700', fontSize: 18, lineHeight: 25 }]}><Text>{`${entry.basic_number}. Temel`}</Text><Text> · </Text><Text>{`${entry.renewal_number}. Yenileme`}</Text></Text>
              </View>
              {days !== null && <Badge>{upcomingCountdown(days)}</Badge>}
            </View>
            <View style={{ gap: 4 }}><Text style={styles.muted}>Sınav tarihi</Text><Text style={[styles.text, { fontSize: 20, lineHeight: 28, fontWeight: '700' }]}>{calendarDate(entry.exam_date, false)}</Text></View>
            <Text style={styles.muted}>Eğitim bitişi: {calendarDate(entry.training_deadline, false)}</Text>
          </View>
        </Card>;
      })}</Columns>}
      <View style={{ gap: 4 }}><Text style={styles.muted}>{calendarNotice}</Text>{data.verified_at && <Text style={styles.muted}>Son doğrulama: {new Date(data.verified_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</Text>}<TextLink onPress={() => { void sourceLink.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }}>EGM takvimini aç ↗</TextLink><ErrorNotice error={sourceLink.error} retry={() => { void sourceLink.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }} /></View>
    </>}
  </>;
}
