import { useContext, useEffect, useState } from 'react';
import { AppState, Pressable, View } from 'react-native';
import { calendarDate, nextExamRefreshDelay, upcomingCountdown } from '@oggaq/study-core';
import { cardDensity, cardTone } from '@oggaq/design-tokens';
import { api } from './api';
import { useOnReturn, useResource } from './hooks';
import { ScreenActive } from './screenActivity';
import { useTheme } from './themeContext';
import { CalendarDays, ChevronRight } from './icons';
import { Text } from './text';
import { Card, ErrorNotice, TextLink } from './ui';

export function UpcomingExamCard({ open }: { open: (year?: number) => void }) {
  const { palette, styles } = useTheme();const active = useContext(ScreenActive);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const resource = useResource(signal => api.request('get', '/api/v1/exam-calendar/next', { signal }), []);
  const data = resource.data?.data;const reload = resource.reload;
  useOnReturn(() => { void reload(); });
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => { setForeground(state === 'active');if (state === 'active' && active) void reload(); });
    return () => subscription.remove();
  }, [active, reload]);
  useEffect(() => {
    if (!active || !foreground) return;
    const timer = setTimeout(() => { void reload(); }, resource.error ? 300000 : nextExamRefreshDelay(data?.server_time));
    return () => clearTimeout(timer);
  }, [active, foreground, data, resource.error, reload]);
  if (!data) return <Card tone="blue"><Text style={[styles.text, { fontWeight: '700' }]}>Sıradaki sınav</Text>{resource.error ? <ErrorNotice error={resource.error} retry={() => { void reload(); }} /> : <Text accessibilityRole="progressbar" accessibilityLabel="Sınav tarihi yükleniyor" style={styles.muted}>Sınav tarihi yükleniyor…</Text>}<TextLink onPress={() => open()}>Sınav takvimini gör</TextLink></Card>;
  if (!data.entry || data.days_remaining === null) return <Card tone="blue"><Text style={[styles.text, { fontWeight: '700' }]}>Sıradaki sınav</Text><Text style={styles.muted}>Yaklaşan sınav tarihi henüz doğrulanmadı.</Text><TextLink onPress={() => open()}>Sınav takvimini gör</TextLink>{resource.error && <ErrorNotice error={resource.error} retry={() => { void reload(); }} />}</Card>;
  const entry = data.entry;const date = calendarDate(entry.exam_date);const countdown = upcomingCountdown(data.days_remaining);const tint = cardTone(palette, 'blue');const accent = cardTone(palette, 'sand');
  return <View style={{ gap: 6 }}><Pressable testID="upcoming-exam" accessibilityRole="button" accessibilityLabel={`Sıradaki sınav: ${date}, ${entry.basic_number}. Temel, ${entry.renewal_number}. Yenileme, ${countdown}. Sınav takvimini gör`} onPress={() => open(Number(entry.exam_date.slice(0,4)))}
    style={({pressed}) => ({ backgroundColor: tint.surface, borderWidth: 1, borderColor: pressed ? palette.primary : tint.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: cardDensity.paddingY, gap: 8 })}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}><CalendarDays size={17} color={palette.primary} /><Text style={{ color: palette.primary, fontWeight: '700', fontSize: 13 }}>Sıradaki sınav</Text><ChevronRight size={16} color={palette.primary} /></View>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 160, gap: 4 }}><Text style={{ color: palette.ink, fontWeight: '700', fontSize: 18, lineHeight: 25 }}>{date}</Text><Text style={styles.muted}>{`${entry.basic_number}. Temel · ${entry.renewal_number}. Yenileme`}</Text></View>
      <View style={{ minWidth: 76, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, backgroundColor: accent.surface, borderWidth: 1, borderColor: accent.line, alignItems: 'center' }}>
        <Text style={{ color: accent.accent, fontSize: data.days_remaining === 0 ? 22 : 30, lineHeight: 36, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{data.days_remaining === 0 ? 'Bugün' : data.days_remaining}</Text>{data.days_remaining > 0 && <Text style={{ color: accent.accent, fontSize: 12, lineHeight: 18 }}>gün kaldı</Text>}
      </View>
    </View>
    {(data.status === 'stale' || resource.error) && <Text style={styles.muted}>Son doğrulanmış takvim</Text>}
  </Pressable>{resource.error && <ErrorNotice error={resource.error} retry={() => { void reload(); }} />}</View>;
}
