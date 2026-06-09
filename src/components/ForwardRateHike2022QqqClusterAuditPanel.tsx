import { StyleSheet, Text } from 'react-native';
import type { ForwardRateHike2022QqqAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRateHike2022QqqAuditReport | null;
  loading?: boolean;
};

export function ForwardRateHike2022QqqClusterAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その45 · 2022QQQ</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const y2022 = report.qqqYearRows.find((r) => r.year === 2022);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その45 · 2022QQQ</Text>
      <Text style={styles.subtitle}>
        2022取引{report.trades2022.length} · QQQ2022
        {y2022?.tradeCount ?? 0}件
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.line}>{report.answerCJa}</Text>
      <Text style={styles.verdict}>{report.sameCulpritConclusionJa}</Text>
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
