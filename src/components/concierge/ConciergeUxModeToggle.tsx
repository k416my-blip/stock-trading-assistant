import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  CONCIERGE_UX_MODE_HINTS_JA,
  CONCIERGE_UX_MODE_LABELS_JA,
} from '../../constants/conciergeUx';
import type { ConciergeUxDisplayMode } from '../../types/conciergeUx';
import { theme } from '../../theme';

type Props = {
  mode: ConciergeUxDisplayMode;
  onChange: (mode: ConciergeUxDisplayMode) => void;
};

export function ConciergeUxModeToggle({ mode, onChange }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-ux-mode-toggle">
      <Text style={styles.label}>表示モード</Text>
      <View style={styles.row}>
        {(['beginner', 'advanced'] as const).map((m) => {
          const active = mode === m;
          return (
            <Pressable
              key={m}
              onPress={() => onChange(m)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {CONCIERGE_UX_MODE_LABELS_JA[m]}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>{CONCIERGE_UX_MODE_HINTS_JA[mode]}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: theme.spacing.sm },
  label: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
  },
  row: { flexDirection: 'row', gap: theme.spacing.xs },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  chipText: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  chipTextActive: { color: theme.colors.primary, fontWeight: '600' },
  hint: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginTop: 4,
    lineHeight: 18,
  },
});
