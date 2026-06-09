import { StyleSheet, Text } from 'react-native';
import type { ForwardWalkForward31AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardWalkForward31AuditReport | null;
  loading?: boolean;
};

export function ForwardWalkForward31AuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その31 · WF検証</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その31 · WF検証</Text>
      <Text style={styles.subtitle}>判定 {report.grade} · OOS累積{report.aggregateTest.cumulativeReturnPct}%</Text>
      <Text style={styles.line}>{report.gradeJa}</Text>
      <Text style={styles.verdict}>{report.answer7Ja}</Text>
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
