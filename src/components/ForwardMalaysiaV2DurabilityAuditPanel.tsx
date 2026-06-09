import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV2DurabilityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV2DurabilityAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV2DurabilityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その66 · MY v2耐久</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その66 · MY v2 最終耐久</Text>
      <Text style={styles.subtitle}>
        5347/5398 · MC{report.v2Bootstrap.runs}破産{report.v2Bootstrap.bankruptcyRatePct}% ·{' '}
        {report.adoptionGrade}評価
      </Text>
      <Text style={styles.line}>
        累積{report.v2Metrics.cumulativeReturnPct}% · 配当込{report.v2Metrics.cumulativeWithDividendPct}%
        · RM{report.recommendedLotMYR}/枠
      </Text>
      <Text style={styles.verdict}>{report.adoptionVerdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
