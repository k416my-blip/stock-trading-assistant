import { StyleSheet, Text, View } from 'react-native';
import { TermHint } from './TermHint';
import type { PositionSizingResult } from '../types';
import { theme } from '../theme';
import { Card } from './ui/Card';

const RISK_LABEL: Record<NonNullable<PositionSizingResult['riskCategory']>, string> = {
  low: '低リスク',
  medium: '中リスク',
  high: '高リスク',
  elevated: '要注意',
};

type Props = { result: PositionSizingResult };

export function PositionSizingCard({ result }: Props) {
  return (
    <Card>
      <TermHint term="buyingPower" />
      <Text style={styles.row}>推奨配分: {result.suggestedAllocationPct ?? '—'}%</Text>
      <Text style={styles.row}>最大投資額: RM{(result.maxPositionSizeMYR ?? result.maxPositionValue).toFixed(0)}</Text>
      <Text style={styles.row}>推奨株数: {result.suggestedShares}株</Text>
      {result.riskCategory ? (
        <Text style={styles.row}>リスク区分: {RISK_LABEL[result.riskCategory]}</Text>
      ) : null}
      <Text style={styles.note}>{result.notes}</Text>
      {result.warnings && result.warnings.length > 0 ? (
        <View style={styles.warnBlock}>
          {result.warnings.map((w) => (
            <Text key={w} style={styles.warn}>
              · {w}
            </Text>
          ))}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { color: theme.colors.text, marginTop: theme.spacing.sm },
  note: { color: theme.colors.textMuted, marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm },
  warnBlock: { marginTop: theme.spacing.sm, gap: 2 },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
