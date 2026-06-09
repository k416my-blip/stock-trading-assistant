import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardEightCellAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardEightCellAuditReport | null;
  loading?: boolean;
};

export function ForwardEightCellAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>8セル監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>8セル監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD×52w×SPY 8セル</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.cells.map((c) => (
          <View key={c.labelJa} style={styles.row}>
            <Text style={styles.label}>{c.labelJa}</Text>
            <Text style={styles.line}>
              {c.tradeCount}件 · {c.winRatePct}% · R{c.avgReturnPct ?? '—'}% · Sharpe {c.sharpe ?? '—'}
            </Text>
            <Text style={styles.muted}>満了 {c.maxHoldRatePct}%</Text>
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
