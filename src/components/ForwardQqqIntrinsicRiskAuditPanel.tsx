import { StyleSheet, Text } from 'react-native';
import type { ForwardQqqIntrinsicRiskAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardQqqIntrinsicRiskAuditReport | null;
  loading?: boolean;
};

export function ForwardQqqIntrinsicRiskAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その48 · QQQ固有</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その48 · QQQ固有</Text>
      <Text style={styles.subtitle}>損失TOP20 · QQQ固有リスク検証</Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.verdict}>{report.qqqOnlyDangerJa}</Text>
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
