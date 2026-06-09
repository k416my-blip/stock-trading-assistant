import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52DedupTimelineAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52DedupTimelineAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52DedupTimelineAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>重複除外 時系列</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>重複除外 時系列</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>18イベント 時系列</Text>
      <Text style={styles.subtitle}>
        連敗{report.maxConsecutiveLosses} · DD{report.maxDrawdownPct}% · 累積
        {report.finalCumulativeReturnPct}%
      </Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.timeline.map((r) => (
          <View key={r.signalDate} style={styles.row}>
            <Text style={styles.line}>
              {r.signalDate} · {r.avgReturnPct}% · {r.outcomeJa} · ETF{r.etfCount} → 累積
              {r.cumulativeReturnPct}%
            </Text>
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
  scroll: { maxHeight: 280, marginTop: theme.spacing.sm },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: 2,
    marginTop: 2,
  },
  line: { color: theme.colors.text, fontSize: 10 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
