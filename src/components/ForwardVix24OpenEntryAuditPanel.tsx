import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix24OpenEntryAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24OpenEntryAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24OpenEntryAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 寄付き検証</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  const { closeMetrics: c, openMetrics: o } = report;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 寄付き vs 終値</Text>
      <Text style={styles.subtitle}>{report.cohortTradeCount}件 · 監査のみ</Text>
      <View style={styles.row}>
        <Text style={styles.label}>終値 {c.winRatePct}% / 累積{c.cumulativeReturnPct}%</Text>
        <Text style={styles.label}>寄付き {o.winRatePct}% / 累積{o.cumulativeReturnPct}%</Text>
      </View>
      <Text style={[styles.verdict, report.liveCandidate ? styles.pass : styles.fail]}>
        {report.liveCandidateVerdictJa}
      </Text>
      {report.comparison.map((r) => (
        <Text key={r.metricJa} style={styles.line}>
          {r.metricJa}: {r.closeValue} → {r.openValue} (Δ{r.delta})
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  row: { marginTop: 4 },
  label: { color: theme.colors.text, fontSize: 9 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  pass: { color: theme.colors.success ?? '#2ecc71' },
  fail: { color: theme.colors.textMuted },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
