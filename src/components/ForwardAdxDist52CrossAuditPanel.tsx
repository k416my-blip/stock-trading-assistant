import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardAdxDist52CrossAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdxDist52CrossAuditReport | null;
  loading?: boolean;
};

export function ForwardAdxDist52CrossAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>ADX × 52w クロス集計</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>ADX × 52w クロス集計</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const nonEmpty = report.cells.filter((c) => c.tradeCount > 0);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ADX × 52w乖離 クロス集計</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · {report.totalTrades}件 · セル
        {nonEmpty.length}/{report.cells.length}
      </Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {nonEmpty.map((c) => (
          <View key={`${c.adxBucketId}_${c.dist52BucketId}`} style={styles.cell}>
            <Text style={styles.cellTitle}>
              ADX {c.adxLabelJa} × 52w {c.dist52LabelJa}
            </Text>
            <Text style={styles.line}>
              {c.tradeCount}件 · 勝率 {c.winRatePct}% · 均R {c.avgReturnPct ?? '—'}%
            </Text>
            <Text style={styles.muted}>保有 {c.avgHoldDays ?? '—'}日</Text>
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
  scroll: { maxHeight: 320, marginTop: theme.spacing.sm },
  cell: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  cellTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.xs,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
