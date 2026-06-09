import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52DedupDayAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52DedupDayAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52DedupDayAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w 日次重複除外</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD×52w 日次重複除外</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const d = report.afterDedup;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>シグナル日1件集計</Text>
      <Text style={styles.subtitle}>
        {report.cohortTradeCount}トレード → {d.dayCount}日
      </Text>
      <View style={styles.row}>
        <Text style={styles.line}>
          勝率 {d.winRatePct}% · R{d.avgReturnPct ?? '—'}% · Sharpe {d.sharpe ?? '—'}
        </Text>
        <Text style={styles.muted}>25日満了 {d.maxHoldRatePct}%</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  row: { marginTop: theme.spacing.xs },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
