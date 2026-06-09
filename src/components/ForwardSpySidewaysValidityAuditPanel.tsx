import { StyleSheet, Text } from 'react-native';
import type { ForwardSpySidewaysValidityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSpySidewaysValidityAuditReport | null;
  loading?: boolean;
};

export function ForwardSpySidewaysValidityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その44 · SPY横ばい</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その44 · SPY横ばい</Text>
      <Text style={styles.subtitle}>
        候補{report.coincidence.sidewaysCandidateCount} · 実行横ばい
        {report.coincidence.sidewaysExecutedCount} · 枠代替
        {report.coincidence.slotSubstitutionLikely ? 'あり' : '要再検'}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.line}>{report.answerCJa}</Text>
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
