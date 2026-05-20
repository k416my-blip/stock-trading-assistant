import { StyleSheet, Text, View } from 'react-native';
import { LabeledValue } from './TermHint';
import type { TradeSuggestion } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

type Props = { suggestion: TradeSuggestion; currencySymbol: string };

export function TradeSuggestionCard({ suggestion, currencySymbol }: Props) {
  return (
    <Card>
      <Text style={styles.title}>買い推奨価格（手動注文用）</Text>
      <LabeledValue term="entry" value={`${currencySymbol}${suggestion.entryPrice.toFixed(2)}`} />
      <LabeledValue term="stopLoss" value={`${currencySymbol}${suggestion.stopLoss.toFixed(2)}`} valueStyle={styles.danger} />
      <LabeledValue term="takeProfit" value={`${currencySymbol}${suggestion.takeProfit.toFixed(2)}`} valueStyle={styles.success} />
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
