import { StyleSheet, Text, View } from 'react-native';
import type { ForwardRegimePerformanceAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRegimePerformanceAuditReport | null;
  loading?: boolean;
};

export function ForwardRegimePerformanceAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPYレジーム別成績</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPYレジーム別成績</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>SPYレジーム別成績</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · {report.totalTrades}件
      </Text>
      <Text style={styles.note}>sideways = sideways_deep（52w≤-5%）</Text>

      {report.groups.map((g) => (
        <View key={g.id} style={styles.block}>
          <Text style={styles.groupLabel}>{g.labelJa}</Text>
          <Text style={styles.line}>
            {g.tradeCount}件 · 勝率 {g.winRatePct}% · 均R {g.avgReturnPct ?? '—'}% · 保有{' '}
            {g.avgHoldDays ?? '—'}日
          </Text>
          <Text style={styles.muted}>
            ADX {g.avgAdx ?? '—'} · MACD {g.avgMacd ?? '—'}% · 52w {g.avgDist52 ?? '—'}%
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
  note: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2, fontStyle: 'italic' },
  block: { marginTop: theme.spacing.sm },
  groupLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 2 },
});
