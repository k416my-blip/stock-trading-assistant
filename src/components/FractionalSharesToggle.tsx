import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FRACTIONAL_SHARES_HINT } from '../constants/allocation';
import { theme } from '../theme';
import { TermHint } from './TermHint';

type Props = {
  enabled: boolean;
  onChange: (enabled: boolean) => void;
};

export function FractionalSharesToggle({ enabled, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <TermHint term="fractionalShares" showDescription={false} />
      <View style={styles.row}>
        <Pressable
          onPress={() => onChange(false)}
          style={[styles.chip, !enabled && styles.chipActive]}
        >
          <Text style={[styles.text, !enabled && styles.textActive]}>OFF（1株単位）</Text>
        </Pressable>
        <Pressable
          onPress={() => onChange(true)}
          style={[styles.chip, enabled && styles.chipActive]}
        >
          <Text style={[styles.text, enabled && styles.textActive]}>ON（端株）</Text>
        </Pressable>
      </View>
      <Text style={styles.hint}>{FRACTIONAL_SHARES_HINT}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: theme.spacing.sm },
  row: { flexDirection: 'row', gap: theme.spacing.sm },
  chip: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  text: { color: theme.colors.textMuted, fontWeight: '600', fontSize: theme.fontSize.sm },
  textActive: { color: '#fff' },
  hint: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
