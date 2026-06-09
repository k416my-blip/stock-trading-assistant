import { StyleSheet, Text } from 'react-native';
import type { ForwardTpTargetSensitivityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardTpTargetSensitivityAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  optimal_tp3: '+3%最適に近い',
  robust_tp3: '頑健範囲',
  accidental_tp3: '偶然選定疑い',
};

export function ForwardTpTargetSensitivityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その14 · 利確感度</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const r3 = report.rows.find((r) => r.takeProfitPct === 3);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その14 · 利確感度</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · +3%: {r3?.tradeCount ?? '—'}件
      </Text>
      {report.rows.map((r) => (
        <Text key={r.takeProfitPct} style={styles.line}>
          {r.labelJa}: {r.tradeCount}件 WR{r.winRatePct}% 累積{r.cumulativeReturnPct}% 効率
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
