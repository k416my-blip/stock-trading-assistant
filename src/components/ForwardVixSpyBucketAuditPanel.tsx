import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVixSpyBucketAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixSpyBucketAuditReport | null;
  loading?: boolean;
};

export function ForwardVixSpyBucketAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX / SPY区分</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX / SPY区分</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX / SPY63日 区分</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>
      <Text style={styles.section}>VIX</Text>
      {report.vixSection.rows.map((r) => (
        <Text key={r.labelJa} style={styles.line}>
          {r.labelJa}: {r.tradeCount} · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}%
        </Text>
      ))}
      <Text style={styles.section}>SPY63日</Text>
      {report.spySection.rows.map((r) => (
        <Text key={r.labelJa} style={styles.line}>
          {r.labelJa}: {r.tradeCount} · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}%
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
  line: { color: theme.colors.text, fontSize: 10, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
