import { ScrollView, StyleSheet, Text } from 'react-native';
import type { ForwardVix24StackAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24StackAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24StackAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24スタック</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 8パターン</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.rows.map((r) => (
          <Text key={r.stackId} style={styles.line}>
            {r.labelJa}: {r.tradeCount} · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}%
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  scroll: { maxHeight: 200, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
