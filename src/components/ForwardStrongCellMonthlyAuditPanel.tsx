import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardStrongCellMonthlyAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardStrongCellMonthlyAuditReport | null;
  loading?: boolean;
};

export function ForwardStrongCellMonthlyAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル月別監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル月別監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最強セル月別</Text>
      <Text style={styles.subtitle}>
        {report.strongCellTradeCount}件 · {report.aprilMonth}除外後 {report.excludingApril.tradeCount}件
      </Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        <Text style={styles.section}>月別</Text>
        {report.monthlyRows.map((r) => (
          <View key={r.month} style={styles.row}>
            <Text style={styles.label}>{r.month}</Text>
            <Text style={styles.line}>
              {r.tradeCount}件 · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}% · Sharpe {r.sharpe ?? '—'}
            </Text>
            <Text style={styles.muted}>満了 {r.maxHoldRatePct}%</Text>
          </View>
        ))}

        <Text style={styles.section}>4月クラスター</Text>
        <View style={styles.row}>
          <Text style={styles.label}>{report.aprilMonth}のみ ({report.aprilClusterCount}件)</Text>
          <Text style={styles.line}>
            {report.aprilCluster.winRatePct}% · R{report.aprilCluster.avgReturnPct ?? '—'}% · Sharpe{' '}
            {report.aprilCluster.sharpe ?? '—'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>除外後</Text>
          <Text style={styles.line}>
            {report.excludingApril.tradeCount}件 · {report.excludingApril.winRatePct}% · R
            {report.excludingApril.avgReturnPct ?? '—'}% · Sharpe {report.excludingApril.sharpe ?? '—'}
          </Text>
        </View>
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  scroll: { maxHeight: 320, marginTop: theme.spacing.sm },
  section: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: 10 },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
