import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix25WinnerHoldAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25WinnerHoldAuditReport | null;
  loading?: boolean;
};

export function ForwardVix25WinnerHoldAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 保有日数</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 保有日数</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥25 勝ち・保有日数</Text>
      <Text style={styles.subtitle}>{report.winnerCount}件</Text>
      {report.buckets.map((b) => (
        <View key={b.bucketId} style={styles.row}>
          <Text style={styles.label}>
            {b.labelJa}: {b.tradeCount}件 · 均R{b.avgReturnPct ?? '—'}%
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
  row: { marginTop: 6 },
  label: { color: theme.colors.text, fontSize: 10 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
