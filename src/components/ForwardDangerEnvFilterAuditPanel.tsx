import { StyleSheet, Text } from 'react-native';
import type { ForwardDangerEnvFilterAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardDangerEnvFilterAuditReport | null;
  loading?: boolean;
};

export function ForwardDangerEnvFilterAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その43 · 危険環境</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const best = [...report.filterRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その43 · 危険環境</Text>
      <Text style={styles.subtitle}>
        {report.filterRows.length}通り · 推奨{report.operationalFilterId} ·{' '}
        {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerCJa}</Text>
      <Text style={styles.line}>{report.answerDJa}</Text>
      {best ? (
        <Text style={styles.line}>
          累積1位 {best.filterId}: {best.cumulativeReturnPct}% · スキップ
          {best.skippedTradeCount}
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.ddReductionConclusionJa}</Text>
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
