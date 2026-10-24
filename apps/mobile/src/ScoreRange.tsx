import Slider from '@react-native-community/slider';
import { Text, View } from 'react-native';
import { useTheme } from './themeContext';
export interface ScoreRangeProps { label: string; value: number; maximum: number; change: (value: number) => void; disabled?: boolean }
export function ScoreRange({ label, value, maximum, change, disabled }: ScoreRangeProps) {
  const { palette, styles } = useTheme();
  return <View style={{ gap: 8 }}><View style={styles.between}><Text style={[styles.text, { flex: 1, fontWeight: '700' }]}>{label}</Text><Text style={{ color: palette.primary, fontSize: 22, fontWeight: '800' }}>{value} / {maximum}</Text></View><Slider accessibilityLabel={label} accessibilityHint="Kaydırarak sayıyı değiştir" style={{ width: '100%', height: 44 }} minimumValue={0} maximumValue={Math.max(1, maximum)} step={1} value={value} onValueChange={change} disabled={disabled || maximum === 0} minimumTrackTintColor={palette.primary} maximumTrackTintColor={palette.line} thumbTintColor={palette.primary} /><View style={styles.between}><Text style={styles.muted}>0</Text><Text style={styles.muted}>{maximum}</Text></View></View>;
}
