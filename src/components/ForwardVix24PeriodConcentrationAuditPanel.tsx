import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix24PeriodConcentrationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24PeriodConcentrationAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24PeriodConcentrationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 期間分割</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 期間分割監査</Text>
      <Text style={styles.subtitle}>
        4〜5月集中 {report.profitConcentrationAprMay2025Pct ?? '—'}%
      </Text>
      {report.periods.map((p) => (
        <Text key={p.periodId} style={styles.line}>
          {p.labelJa}: {p.tradeCount}件 · {p.winRatePct}% · 累積{p.cumulativeReturnPct}%
        </Text>
      ))}
      <Text style={styles.line}>
        VIX≥24 {report.vixOccurrences.vixGte24Days}日 · ≥30 {report.vixOccurrences.vixGte30Days}日
      </Text>
      <Text style={styles.verdict}>{report.concentrationVerdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.text, fontSize: 10, fontWeight: '600', marginTop: 6 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
