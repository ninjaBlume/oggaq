import { useState } from 'react';
import { Linking, View } from 'react-native';
import { calendarDate, calendarDaysRemaining, calendarNotice, calendarRules, calendarStaleNotice, calendarToday, calendarYears, orderedCalendarEntries, upcomingCountdown } from '@oggaq/study-core';
import { api } from './api';
import { useOnReturn, useResource, useTask } from './hooks';
import { ArrowLeft, BookOpen, CalendarDays, CheckCircle2, ExternalLink, GraduationCap, ShieldCheck } from './icons';
import { Badge, Button, Card, Columns, EmptyState, ErrorNotice, ReadNotice, IconButton, Loading, Sheet, TextLink } from './ui';
import { Text } from './text';
import { useTheme } from './themeContext';

const ruleIcons = { unarmed: BookOpen, armed: ShieldCheck, shooting: CheckCircle2, renewal: GraduationCap };
const detailText = { fontSize: 14, lineHeight: 20 } as const;

export function ExamCalendarScreen({ initialYear, back }: { initialYear?: number; back: () => void }) {
  const { styles, palette } = useTheme();
  const today = calendarToday();const current = Number(today.slice(0, 4));
  const [year, setYear] = useState(initialYear ?? current);const [picking, setPicking] = useState(false);
  const calendar = useResource(signal => api.request('get', '/api/v1/exam-calendar', { signal, query: { year } }), [year]);
  useOnReturn(() => { void calendar.reload(); });
  const link = useTask<void>();const sourceLink = useTask<void>();const data = calendar.data?.data;
  const entries = orderedCalendarEntries(data?.entries ?? [], today);
  const openSource = (url: string) => { void link.run(async () => { await Linking.openURL(url); }, () => {}); };
  return <View style={{ gap: 12 }}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <IconButton icon={ArrowLeft} label="Ana sayfaya dön" onPress={back} />
      <View style={{ flex: 1, gap: 2 }}><Text accessibilityRole="header" style={[styles.heading, { fontSize: 22, lineHeight: 28 }]}>Sınav tarihleri ve kurallar</Text><Text style={[styles.muted, detailText]}>Hazırlığını resmî takvime göre planla.</Text></View>
    </View>
    <Card tone="indigo" compact>
      <View testID="calendar-rules" style={{ gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ padding: 6, borderRadius: 10, backgroundColor: palette.softPrimary }}><ShieldCheck size={18} color={palette.primary} /></View>
          <Text accessibilityRole="header" style={[styles.heading, { flex: 1, fontSize: 17, lineHeight: 23 }]}>{calendarRules.title}</Text>
        </View>
        <Columns>{calendarRules.items.map(rule => {
          const Icon = ruleIcons[rule.id];
          return <View key={rule.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <Icon size={16} color={palette.primary} style={{ marginTop: 2 }} />
            <Text style={[styles.text, detailText, { flex: 1 }]}><Text style={{ fontWeight: '700' }}>{rule.title}: </Text>{rule.text}</Text>
          </View>;
        })}</Columns>
        <Text style={[styles.muted, { fontSize: 13, lineHeight: 19 }]}>{calendarRules.note}</Text>
        <Button compact icon={ExternalLink} onPress={() => openSource(calendarRules.sourceUrl)}>Resmî EGM sayfası</Button>
        <TextLink onPress={() => openSource(calendarRules.regulationUrl)}>Güncel yönetmeliği incele ↗</TextLink>
        <ErrorNotice error={link.error} />
      </View>
    </Card>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
      <Text accessibilityRole="header" style={[styles.heading, { flexGrow: 1, flexBasis: 180, fontSize: 18, lineHeight: 24 }]}>Sınav takvimi ve eğitim bitişleri</Text>
      <View><Button secondary compact onPress={() => setPicking(true)}>{`Takvim yılı: ${year}`}</Button></View>
    </View>
    <Sheet visible={picking} title="Takvim yılı" close={() => setPicking(false)}>{calendarYears(data, current).map(value => <Button key={value} secondary={year !== value} onPress={() => { setYear(value);setPicking(false); }}>{String(value)}</Button>)}</Sheet>
    <ReadNotice resource={calendar} refreshOnly />{calendar.loading && !calendar.data ? <Loading /> : calendar.error || !data ? <ReadNotice resource={calendar} /> : <>
      {data.status === 'stale' && <Card tone="sand"><Text accessibilityRole="alert" style={styles.text}>{calendarStaleNotice}</Text></Card>}
      {entries.length === 0 ? <EmptyState title={`${year} takvimi henüz hazır değil`} message="Doğrulanmış resmî takvim alındığında burada görünecek." /> : <View style={{ gap: 8 }}><Columns>{entries.map((entry, index) => {
        const days = calendarDaysRemaining(entry.exam_date, today);const next = index === 0 && days !== null;
        return <Card key={`${entry.basic_number}-${entry.renewal_number}`} tone={next ? 'blue' : undefined} compact>
          <View testID="calendar-entry" style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <View style={{ backgroundColor: palette.softPrimary, borderRadius: 10, padding: 6 }}><CalendarDays size={18} color={palette.primary} /></View>
              <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
                <Text style={{ color: next ? palette.primary : palette.muted, fontSize: 11, lineHeight: 16, fontWeight: '600' }}>{next ? 'Sıradaki sınav' : days === null ? 'Geçmiş sınav' : 'Yaklaşan sınav'}</Text>
                <Text accessibilityRole="header" style={[styles.text, { fontWeight: '700', fontSize: 16, lineHeight: 22 }]}><Text>{`${entry.basic_number}. Temel`}</Text><Text> · </Text><Text>{`${entry.renewal_number}. Yenileme`}</Text></Text>
              </View>
              {days !== null && <Badge>{upcomingCountdown(days)}</Badge>}
            </View>
            <Text style={[styles.text, { fontSize: 16, lineHeight: 22, fontWeight: '700' }]}><Text style={[styles.muted, { fontWeight: '400', ...detailText }]}>Sınav: </Text>{calendarDate(entry.exam_date, false)}</Text>
            <Text style={[styles.muted, detailText]}>Eğitim bitişi: {calendarDate(entry.training_deadline, false)}</Text>
          </View>
        </Card>;
      })}</Columns></View>}
      <View style={{ gap: 4 }}><Text style={[styles.muted, { fontSize: 13, lineHeight: 19 }]}>{calendarNotice}</Text>{data.verified_at && <Text style={[styles.muted, { fontSize: 12, lineHeight: 18 }]}>Son doğrulama: {new Date(data.verified_at).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })}</Text>}<TextLink onPress={() => { void sourceLink.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }}>EGM takvimini aç ↗</TextLink><ErrorNotice error={sourceLink.error} retry={() => { void sourceLink.run(async () => { await Linking.openURL(data.source_url); }, () => {}); }} /></View>
    </>}
  </View>;
}
