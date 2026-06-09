import { StyleSheet, Text } from 'react-native';
import type { ForwardWf7030OosAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardWf7030OosAuditReport | null;
  loading?: boolean;
};

export function ForwardWf7030OosAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その63 · WF OOS</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その63 · WF OOS 70/30</Text>
      <Text style={styles.subtitle}>
        OOS累積{report.test.cumulativeReturnPct}% · 劣化{report.cumulativeDegradationPct ?? '—'}% ·{' '}
        {report.adoptionGrade}評価
      </Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.line}>{report.answerDJa}</Text>
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
