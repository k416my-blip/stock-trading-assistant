import { StyleSheet, Text } from 'react-native';
import type { ForwardLehmanBreakdownAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardLehmanBreakdownAuditReport | null;
  loading?: boolean;
};

export function ForwardLehmanBreakdownAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その57 · リーマン級</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その57 · リーマン級</Text>
      <Text style={styles.subtitle}>
        累積{report.baselineCumulativePct}% · MaxDD{report.baselineMaxDrawdownPct ?? '—'}% ·{' '}
        {report.fixGrade}評価
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerDJa}</Text>
      <Text style={styles.verdict}>{report.fixVerdictJa}</Text>
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
