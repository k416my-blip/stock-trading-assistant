import { StyleSheet, Text, View } from 'react-native';
import { PRACTICE_DISCLAIMER } from '../constants/practice';
import { theme } from '../theme';

export function PracticeModeBadge() {
  return (
    <View style={styles.badge}>
      <Text style={styles.title}>練習モード</Text>
      <Text style={styles.sub}>{PRACTICE_DISCLAIMER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: '#3b2667',
    borderWidth: 1,
    borderColor: '#7c3aed',
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
  },
  title: { color: '#c4b5fd', fontWeight: '800', fontSize: theme.fontSize.lg, letterSpacing: 1 },
  sub: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
});
