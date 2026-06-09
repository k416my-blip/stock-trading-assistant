import { StyleSheet, Text, View } from 'react-native';
import type { ForwardSixLossRootCauseAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSixLossRootCauseAuditReport | null;
  loading?: boolean;
};

export function ForwardSixLossRootCauseAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>6敗 原因分析</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>6敗 原因分析</Text>
      <Text style={styles.subtitle}>
        勝{report.winCount} 敗{report.lossCount} · 回避率{report.lossAvoidanceRatePct ?? '—'}%
      </Text>
      {report.lossRows.map((r) => (
        <Text key={`${r.entryDate}-${r.ticker}`} style={styles.line}>
          {r.entryDate} {r.ticker} R{r.returnPct}% · VIX{r.vix ?? '—'}
        </Text>
      ))}
      <Text style={styles.verdict}>{report.lossAvoidanceVerdictJa}</Text>
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
