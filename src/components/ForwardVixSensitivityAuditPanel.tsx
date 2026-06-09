import { StyleSheet, Text } from 'react-native';
import type { ForwardVixSensitivityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixSensitivityAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  optimal_24: 'VIX24最適に近い',
  robust_range: '頑健範囲',
  not_optimal_24: '24単独最適でない',
};

export function ForwardVixSensitivityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その11 · VIX感度</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const r24 = report.rows.find((r) => r.vixThreshold === 24);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その11 · VIX感度</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · VIX≥24: {r24?.tradeCount ?? '—'}件
      </Text>
      {report.rows.map((r) => (
        <Text key={r.vixThreshold} style={styles.line}>
          ≥{r.vixThreshold}: {r.tradeCount}件 WR{r.winRatePct}% 累積{r.cumulativeReturnPct}% 効率
          {r.profitEfficiency ?? '—'}
        </Text>
      ))}
      <Text style={styles.verdict}>{report.verdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
