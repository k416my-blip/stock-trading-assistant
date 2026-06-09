import { StyleSheet, Text } from 'react-native';
import type { ForwardLosingStreakAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardLosingStreakAuditReport | null;
  loading?: boolean;
};

export function ForwardLosingStreakAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その42 · 連敗</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const best = [...report.policyRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その42 · 連敗</Text>
      <Text style={styles.subtitle}>
        {report.policyRows.length}通り · 推奨{report.operationalPolicyId} ·{' '}
        {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerDJa}</Text>
      {best ? (
        <Text style={styles.line}>
          累積1位 {best.policyId}: {best.cumulativeReturnPct}% · スキップ{best.skippedTradeCount}
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.operationalNoteJa}</Text>
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
