import { StyleSheet, Text } from 'react-native';
import type { ForwardVixAdx20AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixAdx20AuditReport | null;
  loading?: boolean;
};

const REC_LABEL: Record<string, string> = {
  maintain: '維持（24）',
  relax_20: '緩和（20）',
  delete: '削除',
};

export function ForwardVixAdx20AuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その24 · VIX×ADX20</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その24 · VIX×ADX20</Text>
      <Text style={styles.subtitle}>
        推奨: {REC_LABEL[report.recommendation] ?? report.recommendation} · 追加
        {report.addedTrades.length}件
      </Text>
      <Text style={styles.line}>
        VIX24累積{report.withVix24.cumulativeReturnPct}% vs なし
        {report.withoutVix.cumulativeReturnPct}% · WR{report.withVix24.winRatePct}% vs{' '}
        {report.withoutVix.winRatePct}%
      </Text>
      <Text style={styles.verdict}>{report.recommendationJa}</Text>
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
