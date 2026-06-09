import { StyleSheet, Text } from 'react-native';
import type { ForwardAdxSensitivityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdxSensitivityAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  optimal_adx25: 'ADX25最適帯',
  robust_adx25: 'ADX25頑健',
  adx_quality_filter: '品質フィルタ',
  adx25_strict: 'ADX25厳しめ',
  mixed: '混合',
};

export function ForwardAdxSensitivityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その17 · ADX感度</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const r25 = report.rows.find((r) => r.adxThreshold === 25);
  const rNone = report.rows.find((r) => r.adxThreshold === null);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その17 · ADX感度</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 差分
        {report.adxNoneOnlyTrades.length}件
      </Text>
      {rNone ? (
        <Text style={styles.line}>
          なし: {rNone.tradeCount}件 WR{rNone.winRatePct}% 累積{rNone.cumulativeReturnPct}%
        </Text>
      ) : null}
      {r25 ? (
        <Text style={styles.line}>
          {'>'}25: {r25.tradeCount}件 WR{r25.winRatePct}% 累積{r25.cumulativeReturnPct}%
        </Text>
      ) : null}
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
