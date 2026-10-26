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
  if (!data.entry || data.days_remaining === null) return <Card tone="blue"><Text style={[styles.text, { fontWeight: '700' }]}>Sıradaki sınav</Text><Text style={styles.muted}>Yaklaşan sınav tarihi henüz doğrulanmadı.</Text><TextLink onPress={() => open()}>Sınav takvimini gör</TextLink>{Boolean(resource.error) && <ErrorNotice error={resource.error} retry={() => { void reload(); }} />}</Card>;
  const entry = data.entry;const date = calendarDate(entry.exam_date);const countdown = upcomingCountdown(data.days_remaining);const tint = cardTone(palette, 'blue');const accent = cardTone(palette, 'sand');
  return <View style={{ gap: 6 }}><Pressable testID="upcoming-exam" accessibilityRole="button" accessibilityLabel={`Sıradaki sınav: ${date}, ${entry.basic_number}. Temel, ${entry.renewal_number}. Yenileme, ${countdown}. Sınav takvimini gör`} onPress={() => open(Number(entry.exam_date.slice(0,4)))}
    style={({pressed}) => ({ backgroundColor: tint.surface, borderWidth: 1, borderColor: pressed ? palette.primary : tint.line, borderRadius: 20, paddingHorizontal: 14, paddingVertical: cardDensity.paddingY, gap: 8 })}>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}>
      <View style={{ flexGrow: 1, flexShrink: 1, flexBasis: 150, gap: 3 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><CalendarDays size={16} color={palette.primary} /><Text style={{ color: palette.primary, fontWeight: '700', fontSize: 15, lineHeight: 21 }}>Sıradaki sınav</Text><ChevronRight size={14} color={palette.primary} /></View>
        <Text style={{ color: palette.ink, fontWeight: '800', fontSize: 21, lineHeight: 27 }}>{calendarDate(entry.exam_date, false)}</Text>
        <Text style={{ color: palette.muted, fontSize: 14, lineHeight: 20 }}>{`${entry.basic_number}. Temel · ${entry.renewal_number}. Yenileme`}</Text>
      </View>
      <View style={{ minWidth: 68, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 14, backgroundColor: accent.surface, borderWidth: 1, borderColor: accent.line, alignItems: 'center' }}>
        <Text style={{ color: accent.accent, fontSize: data.days_remaining === 0 ? 24 : 34, lineHeight: 38, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{data.days_remaining === 0 ? 'Bugün' : data.days_remaining}</Text>{data.days_remaining > 0 && <Text style={{ color: accent.accent, fontSize: 13, lineHeight: 18 }}>gün kaldı</Text>}
      </View>
    </View>
    {(data.status === 'stale' || Boolean(resource.error)) && <Text style={styles.muted}>Son doğrulanmış takvim</Text>}
  </Pressable>{Boolean(resource.error) && <ErrorNotice error={resource.error} retry={() => { void reload(); }} />}</View>;
}
