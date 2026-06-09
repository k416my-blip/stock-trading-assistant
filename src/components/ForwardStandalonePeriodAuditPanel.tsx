import { StyleSheet, Text, View } from 'react-native';
import type { ForwardStandalonePeriodAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardStandalonePeriodAuditReport | null;
  loading?: boolean;
};

export function ForwardStandalonePeriodAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>単独条件 期間別</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>単独条件 期間別</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const macdCells = report.cells.filter((c) => c.filterId === 'macd_high');
  const spyCells = report.cells.filter((c) => c.filterId === 'spy_down');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD / SPY down 期間別</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>

      <Text style={styles.section}>MACD≥{report.macdThreshold}</Text>
      {macdCells.map((c) => (
        <Text key={c.periodId} style={styles.line}>
          {c.periodLabelJa}: {c.tradeCount}件 · {c.winRatePct}% · R{c.avgReturnPct ?? '—'}% · S
          {c.sharpe ?? '—'}
        </Text>
      ))}

      <Text style={styles.section}>SPY down</Text>
      {spyCells.map((c) => (
        <Text key={c.periodId} style={styles.line}>
          {c.periodLabelJa}: {c.tradeCount}件 · {c.winRatePct}% · R{c.avgReturnPct ?? '—'}% · S
          {c.sharpe ?? '—'}
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
