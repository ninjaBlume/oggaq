import { Text, View } from 'react-native';
import type { ScoreRangeProps } from './ScoreRange';
import { useTheme } from './themeContext';
export function ScoreRange({ label, value, maximum, change, disabled }: ScoreRangeProps) {
  const { palette, styles } = useTheme();
  return <View style={{ gap: 8 }}><View style={styles.between}><Text style={[styles.text, { flex: 1, fontWeight: '700' }]}>{label}</Text><Text style={{ color: palette.primary, fontSize: 22, fontWeight: '800' }}>{value} / {maximum}</Text></View><input aria-label={label} type="range" min={0} max={maximum} step={1} value={value} disabled={disabled || maximum === 0} onChange={(e) => change(Number(e.target.value))} style={{ width: '100%', height: 44, accentColor: palette.primary, margin: 0, cursor: 'pointer', backgroundColor: 'transparent' }} /><View style={styles.between}><Text style={styles.muted}>0</Text><Text style={styles.muted}>{maximum}</Text></View></View>;
}
