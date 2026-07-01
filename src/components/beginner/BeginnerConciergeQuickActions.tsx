import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

const QUICK_ACTIONS = [
  { id: 'today', labelKey: 'quickActionToday', seedKey: 'quickSeedToday' },
  { id: 'holdings', labelKey: 'quickActionHoldings', seedKey: 'quickSeedHoldings' },
  { id: 'buy_timing', labelKey: 'quickActionBuyTiming', seedKey: 'quickSeedBuyTiming' },
  { id: 'sell', labelKey: 'quickActionSell', seedKey: 'quickSeedSell' },
  { id: 'urgency', labelKey: 'quickActionUrgency', seedKey: 'quickSeedUrgency' },
  { id: 'order_log', labelKey: 'quickActionOrderLog', seedKey: 'quickSeedOrderLog' },
] as const;

type Props = {
  onAction: (seed: string) => void;
  disabled?: boolean;
};

export function BeginnerConciergeQuickActions({ onAction, disabled }: Props) {
  const { t } = useTranslation('concierge');

  return (
    <View style={styles.wrap} testID="beginner-concierge-quick-actions">
      <Text style={styles.title}>{t('quickActionsTitle')}</Text>
      <View style={styles.chipRow}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.id}
            onPress={() => onAction(t(action.seedKey))}
            disabled={disabled}
            style={({ pressed }) => [
              styles.chip,
              pressed && !disabled && styles.chipPressed,
              disabled && styles.chipDisabled,
            ]}
            accessibilityRole="button"
            accessibilityLabel={t(action.labelKey)}
          >
            <Text style={styles.chipText}>{t(action.labelKey)}</Text>
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
