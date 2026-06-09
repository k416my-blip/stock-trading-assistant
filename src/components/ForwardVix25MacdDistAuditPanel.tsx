import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix25MacdDistAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25MacdDistAuditReport | null;
  loading?: boolean;
};

export function ForwardVix25MacdDistAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 MACD分布</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 MACD分布</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥25 MACD分布</Text>
      <Text style={styles.subtitle}>{report.cohortCount}件</Text>
      {report.buckets.map((b) => (
        <View key={b.bucketId} style={styles.row}>
          <Text style={styles.label}>
            {b.labelJa}: {b.tradeCount}件
          </Text>
          <Text style={styles.line}>
            {b.winRatePct}% · R{b.avgReturnPct ?? '—'}% · S{b.sharpe ?? '—'} · 満{b.maxHoldRatePct}%
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
  row: { marginTop: theme.spacing.sm },
  label: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  line: { color: theme.colors.textMuted, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
