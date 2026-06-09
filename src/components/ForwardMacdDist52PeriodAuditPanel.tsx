import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52PeriodAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52PeriodAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52PeriodAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w 期間別</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w 期間別</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD×52w 期間別</Text>
      <Text style={styles.subtitle}>
        {report.cohortTradeCount}件 / 母集団{report.totalTrades}
      </Text>
      {report.periods.map((p) => (
        <View key={p.periodId} style={styles.row}>
          <Text style={styles.label}>{p.periodLabelJa}</Text>
          <Text style={styles.line}>
            {p.tradeCount}件 · {p.winRatePct}% · R{p.avgReturnPct ?? '—'}% · S{p.sharpe ?? '—'} · 満了
            {p.maxHoldRatePct}%
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.xs },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
