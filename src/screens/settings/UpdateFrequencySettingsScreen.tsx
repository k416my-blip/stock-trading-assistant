import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card } from '../../components/ui/Card';
import { Screen } from '../../components/ui/Screen';
import {
  isHighApiRiskRefreshInterval,
  MARKET_DATA_MESSAGES,
  PRICE_REFRESH_OPTIONS,
  PRICE_REFRESH_SETTINGS,
} from '../../constants/marketData';
import { useApp } from '../../context/AppContext';
import type { PriceRefreshMinutes } from '../../types';
import { theme } from '../../theme';

export function UpdateFrequencySettingsScreen() {
  const { state, updateSettings } = useApp();
  const selected = state.settings.priceRefreshMinutes;
  const showApiLimitWarning = isHighApiRiskRefreshInterval(selected);

  const onSelect = (minutes: PriceRefreshMinutes) => {
    updateSettings({ priceRefreshMinutes: minutes });
  };

  return (
    <Screen title="更新頻度設定" subtitle={PRICE_REFRESH_SETTINGS.sectionDescription}>
      <Card style={styles.warnCard}>
        <Text style={styles.warnText}>· {PRICE_REFRESH_SETTINGS.beginnerWarning}</Text>
      </Card>

      <Card>
        <Text style={styles.sectionLabel}>更新間隔</Text>
        {PRICE_REFRESH_OPTIONS.map((option, index) => {
          const isSelected = selected === option.minutes;
          return (
            <Pressable
              key={option.minutes}
              onPress={() => onSelect(option.minutes)}
              style={({ pressed }) => [
                styles.optionRow,
                index < PRICE_REFRESH_OPTIONS.length - 1 && styles.optionRowBorder,
                pressed && styles.optionRowPressed,
                isSelected && styles.optionRowSelected,
              ]}
            >
              <View style={styles.optionBody}>
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
              </View>
              {isSelected ? (
                <Text style={styles.check}>✓</Text>
              ) : (
                <View style={styles.radioOff} />
              )}
            </Pressable>
          );
        })}
      </Card>

      {showApiLimitWarning ? (
        <Card style={styles.apiWarnCard}>
          <Text style={styles.apiWarnText}>⚠ {PRICE_REFRESH_SETTINGS.apiLimitWarning}</Text>
        </Card>
      ) : null}

      <Card>
        <Text style={styles.note}>{MARKET_DATA_MESSAGES.autoPriceNote}</Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  warnCard: { borderColor: theme.colors.warning, borderWidth: 1 },
  warnText: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 20 },
  sectionLabel: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    gap: theme.spacing.sm,
  },
  optionRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.border,
  },
  optionRowPressed: { opacity: 0.88 },
  optionRowSelected: { backgroundColor: theme.colors.surfaceElevated, marginHorizontal: -theme.spacing.sm, paddingHorizontal: theme.spacing.sm, borderRadius: theme.radius.sm },
  optionBody: { flex: 1 },
  optionLabel: { color: theme.colors.text, fontSize: theme.fontSize.md, fontWeight: '600' },
  optionLabelSelected: { color: theme.colors.primary },
  radioOff: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: theme.colors.border,
  },
  check: { color: theme.colors.primary, fontWeight: '700', fontSize: theme.fontSize.lg },
  apiWarnCard: { borderColor: theme.colors.danger, borderWidth: 1 },
  apiWarnText: { color: theme.colors.danger, fontSize: theme.fontSize.sm, lineHeight: 20, fontWeight: '600' },
  note: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
