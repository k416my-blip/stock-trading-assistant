import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMaxHoldAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMaxHoldAuditReport | null;
  loading?: boolean;
};

export function ForwardMaxHoldAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>25日満了監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>25日満了監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const r = report.reached;
  const m = report.notReached;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>25日満了 vs 利確(+3%)</Text>
      <Text style={styles.subtitle}>
        利確 {r.tradeCount} · 満了 {m.tradeCount} / {report.totalTrades}件
      </Text>

      <Text style={styles.section}>利確到達</Text>
      <Text style={styles.line}>
        R{r.avgReturnPct ?? '—'}% · {r.avgHoldDays ?? '—'}日 · ADX{r.avgAdx ?? '—'} · 52w
        {r.avgDist52 ?? '—'}%
      </Text>

      <Text style={styles.section}>25日満了</Text>
      <Text style={styles.line}>
        R{m.avgReturnPct ?? '—'}% · {m.avgHoldDays ?? '—'}日 · ADX{m.avgAdx ?? '—'} · 52w
        {m.avgDist52 ?? '—'}%
      </Text>

      <Text style={styles.section}>差分</Text>
      <Text style={styles.diff}>
        保有 {report.diff.avgHoldDays ?? '—'}日 · 52w {report.diff.avgDist52 ?? '—'}% · down{' '}
        {report.diff.spyDownPct ?? '—'}pt
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.sm,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  diff: { color: theme.colors.primary, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
