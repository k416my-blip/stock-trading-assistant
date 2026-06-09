import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52EtfAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52EtfAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52EtfAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w ETF別</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w ETF別</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD×52w ETF別</Text>
      <Text style={styles.subtitle}>{report.cohortTradeCount}件</Text>
      {report.etfRows.map((e) => (
        <View key={e.symbol} style={styles.row}>
          <Text style={styles.label}>{e.symbol}</Text>
          <Text style={styles.line}>
            {e.tradeCount}件 · {e.winRatePct}% · R{e.avgReturnPct ?? '—'}% · S{e.sharpe ?? '—'} · 満了
            {e.maxHoldRatePct}%
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.xs },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
