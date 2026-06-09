import { StyleSheet, Text, View } from 'react-native';
import type { ForwardDist52AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardDist52AuditReport | null;
  loading?: boolean;
};

export function ForwardDist52AuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>52w乖離帯別成績</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>52w乖離帯別成績</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>52週高値乖離帯別成績</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · {report.totalTrades}件
        {report.unclassifiedCount > 0 ? ` · 帯外${report.unclassifiedCount}` : ''}
      </Text>

      {report.buckets.map((b) => (
        <View key={b.id} style={styles.bucketBlock}>
          <Text style={styles.bucketLabel}>{b.labelJa}</Text>
          <Text style={styles.line}>
            {b.tradeCount}件 · 勝率 {b.winRatePct}% · 均R {b.avgReturnPct ?? '—'}%
          </Text>
          <Text style={styles.muted}>
            保有 {b.avgHoldDays ?? '—'}日 · ADX {b.avgAdx ?? '—'} · MACD {b.avgMacd ?? '—'}%
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
  bucketBlock: { marginTop: theme.spacing.sm },
  bucketLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 2 },
});
