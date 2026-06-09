import { StyleSheet, Text } from 'react-native';
import type { ForwardExitStrategyAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardExitStrategyAuditReport | null;
  loading?: boolean;
};

export function ForwardExitStrategyAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その28 · 出口戦略</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その28 · 出口戦略</Text>
      <Text style={styles.subtitle}>
        基準 +{report.baselineTakeProfitPct}% / {report.baselineMaxHoldDays}日
      </Text>
      <Text style={styles.line}>{report.answer5Ja}</Text>
      <Text style={styles.verdict}>{report.answer3Ja}</Text>
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
