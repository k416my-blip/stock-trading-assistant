import { StyleSheet, Text, View } from 'react-native';
import type { ForwardDownDist10WalkForwardAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardDownDist10WalkForwardAuditReport | null;
  loading?: boolean;
};

export function ForwardDownDist10WalkForwardAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>down×52w WF独立性</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>down×52w WF独立性</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>down × 52w≤-10% WF独立性</Text>
      <Text style={styles.subtitle}>{report.matchedCount}件</Text>
      <Text style={styles.insight}>{report.independenceInsightJa}</Text>

      {report.periods.map((p) => (
        <View key={p.id} style={styles.block}>
          <Text style={styles.periodTitle}>{p.labelJa}</Text>
          <Text style={styles.line}>
            {p.tradeCount}件 · {p.winRatePct}% · R{p.avgReturnPct ?? '—'}% · Sharpe {p.sharpe ?? '—'}
          </Text>
          <Text style={styles.muted}>利確 {p.takeProfitRatePct}%</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  insight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  block: { marginTop: theme.spacing.sm },
  periodTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
