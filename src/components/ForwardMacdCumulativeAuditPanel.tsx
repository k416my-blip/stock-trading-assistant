import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdCumulativeAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdCumulativeAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdCumulativeAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD累積曲線</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD累積曲線</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD≥{report.macdThreshold} 累積曲線</Text>
      <Text style={styles.subtitle}>
        {report.cohortTradeCount}件 · 全期間累積 {report.finalCumulativeReturnPct}%
      </Text>

      <View style={styles.periodBlock}>
        {report.periodSummaries.map((s) => (
          <Text key={s.periodId} style={styles.periodLine}>
            {s.periodLabelJa}: {s.cumulativeReturnPct}%（{s.tradeCount}件）
          </Text>
        ))}
      </View>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.curve.map((p, i) => (
          <View key={`${p.signalDate}-${p.symbol}-${i}`} style={styles.row}>
            <Text style={styles.line}>
              {p.signalDate} · {p.symbol} · R{p.returnPct}% → 累積{p.cumulativeReturnPct}%
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
  periodBlock: { marginTop: theme.spacing.xs },
  periodLine: { color: theme.colors.text, fontSize: 10 },
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
