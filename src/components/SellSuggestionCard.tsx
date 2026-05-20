import { StyleSheet, Text } from 'react-native';
import { LabeledValue } from './TermHint';
import type { SellSuggestion } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { suggestion: SellSuggestion; currencySymbol: string };

export function SellSuggestionCard({ suggestion, currencySymbol }: Props) {
  return (
    <Card>
      <Text style={styles.title}>売りタイミング（手動売却用）</Text>
      <LabeledValue term="takeProfit" value={`${currencySymbol}${suggestion.targetPrice.toFixed(2)}`} valueStyle={styles.success} />
      <LabeledValue term="stopLoss" value={`${currencySymbol}${suggestion.stopLoss.toFixed(2)}`} valueStyle={styles.danger} />
      <Text style={styles.note}>{suggestion.rationale}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.lg, marginBottom: theme.spacing.xs },
  danger: { color: theme.colors.danger },
  success: { color: theme.colors.success },
  note: { color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm },
});
