import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardLoserFeatureAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardLoserFeatureAuditReport | null;
  loading?: boolean;
};

export function ForwardLoserFeatureAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>負け6件特徴統計</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>負け6件特徴統計</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>負け6件 vs 勝ち90件</Text>
      <Text style={styles.subtitle}>
        勝ち{report.winCount} · 負け{report.lossCount}
      </Text>
      <Text style={styles.insight}>{report.topDiscriminatorsJa}</Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.compareRows.slice(0, 8).map((r) => (
          <View key={`${r.metricId}_${r.labelJa}`} style={styles.row}>
            <Text style={styles.label}>{r.labelJa}</Text>
            <Text style={styles.muted}>勝: {r.winSummaryJa}</Text>
            <Text style={styles.muted}>負: {r.lossSummaryJa}</Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  insight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    marginTop: theme.spacing.sm,
    lineHeight: 18,
  },
  scroll: { maxHeight: 280, marginTop: theme.spacing.sm },
  row: { marginTop: theme.spacing.xs },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.xs },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 1 },
});
