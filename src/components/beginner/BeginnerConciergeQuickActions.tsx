import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BEGINNER_CONCIERGE_QUICK_ACTIONS } from '../../constants/beginnerConciergeQuickActionsJa';
import { theme } from '../../theme';

type Props = {
  onAction: (seed: string) => void;
  disabled?: boolean;
};

export function BeginnerConciergeQuickActions({ onAction, disabled }: Props) {
  return (
    <View style={styles.wrap} testID="beginner-concierge-quick-actions">
      <Text style={styles.title}>よくある質問:</Text>
      <View style={styles.chipRow}>
        {BEGINNER_CONCIERGE_QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onAction(action.seed)}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              pressed && !disabled && styles.chipPressed,
              disabled && styles.chipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={action.label}
          >
            <Text style={styles.chipText}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  title: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surfaceElevated,
  },
  chipPressed: { opacity: 0.85 },
  chipDisabled: { opacity: 0.45 },
  chipText: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
  },
});
