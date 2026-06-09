import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardVixSpyCrossAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixSpyCrossAuditReport | null;
  loading?: boolean;
};

export function ForwardVixSpyCrossAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX×SPY交差表</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX×SPY交差表</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const nonEmpty = report.cells.filter((c) => c.tradeCount > 0);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX×SPY 交差表</Text>
      <Text style={styles.subtitle}>{report.classifiedCount}件分類</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {nonEmpty.map((c) => (
          <Text key={c.cellLabelJa} style={styles.line}>
            {c.vixLabelJa}×{c.spyLabelJa}: {c.tradeCount} · {c.winRatePct}% · R
            {c.avgReturnPct ?? '—'}%
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  scroll: { maxHeight: 280, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 10, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
