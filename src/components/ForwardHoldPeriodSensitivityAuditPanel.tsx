import { StyleSheet, Text } from 'react-native';
import type { ForwardHoldPeriodSensitivityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardHoldPeriodSensitivityAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  optimal_hold25: '25日最適',
  robust_hold25: '25日合理的',
  hold25_suboptimal: '25日要検討',
};

export function ForwardHoldPeriodSensitivityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その15 · 保有期間</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const r25 = report.rows.find((r) => r.maxHoldDays === 25);
  const cap20 = report.baselineProfitCapture.find((p) => p.withinDays === 20);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その15 · 保有期間</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 25日: {r25?.tradeCount ?? '—'}件
      </Text>
      {report.rows.map((r) => (
        <Text key={r.maxHoldDays} style={styles.line}>
          {r.labelJa}: {r.tradeCount}件 WR{r.winRatePct}% 累積{r.cumulativeReturnPct}% 中央
          {r.medianHoldDays ?? '—'}日
        </Text>
      ))}
      {cap20 ? (
        <Text style={styles.line}>
          20日以内利益: {cap20.returnSharePct}%（トレード{cap20.tradeSharePct}%）
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
