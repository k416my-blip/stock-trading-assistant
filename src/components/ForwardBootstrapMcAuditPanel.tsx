import { StyleSheet, Text } from 'react-native';
import type { ForwardBootstrapMcAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardBootstrapMcAuditReport | null;
  loading?: boolean;
};

export function ForwardBootstrapMcAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その62 · Bootstrap MC</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const rm3000 = report.capitalRows.find((r) => r.capitalId === 'rm3000');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その62 · Bootstrap MC</Text>
      <Text style={styles.subtitle}>
        RM3000破産{rm3000?.metrics.bankruptcyRatePct ?? '—'}% · 安全資金RM
        {report.minimumSafeCapitalMYR} · {report.operationalGrade}評価
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      <Text style={styles.verdict}>{report.operationalVerdictJa}</Text>
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
