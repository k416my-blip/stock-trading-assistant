import { StyleSheet, Text } from 'react-native';
import type { ForwardCompoundingAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardCompoundingAuditReport | null;
  loading?: boolean;
};

export function ForwardCompoundingAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その36 · 複利運用</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その36 · 複利運用</Text>
      <Text style={styles.subtitle}>
        {report.tradeCount}件 · 基準{report.baselineModeId} · 推奨{report.operationalReinvestModeId} ·
        {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
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
