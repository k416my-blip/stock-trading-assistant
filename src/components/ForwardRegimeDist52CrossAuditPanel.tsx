import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardRegimeDist52CrossAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRegimeDist52CrossAuditReport | null;
  loading?: boolean;
};

export function ForwardRegimeDist52CrossAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>レジーム×52w 2因子クロス</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>レジーム×52w 2因子クロス</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>SPYレジーム × 52w乖離</Text>
      <Text style={styles.subtitle}>
        {report.totalTrades}件 · {report.minCellTrades}件以上 {report.displayCells.length}セル
      </Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.displayCells.map((c) => (
          <View key={`${c.regimeGroupId}_${c.dist52BucketId}`} style={styles.cell}>
            <Text style={styles.cellTitle}>
              {c.regimeLabelJa} × {c.dist52LabelJa}
            </Text>
            <Text style={styles.line}>
              {c.tradeCount}件 · 勝率 {c.winRatePct}% · 均R {c.avgReturnPct ?? '—'}%
            </Text>
            <Text style={styles.muted}>
              利確 {c.takeProfitRatePct}% · 25日満了 {c.maxHoldRatePct}%
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
  scroll: { maxHeight: 360, marginTop: theme.spacing.sm },
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
