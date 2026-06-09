import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdExclSpringAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdExclSpringAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdExclSpringAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD 4〜5月除外</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>MACD 4〜5月除外</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const r = report.remaining;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>MACD 4〜5月除外後</Text>
      <Text style={styles.subtitle}>
        {report.excludedCount}件除外 → {r.tradeCount}件
      </Text>
      <View style={styles.row}>
        <Text style={styles.line}>
          勝率 {r.winRatePct}% · R{r.avgReturnPct ?? '—'}% · Sharpe {r.sharpe ?? '—'}
        </Text>
        <Text style={styles.muted}>25日満了 {r.maxHoldRatePct}%</Text>
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
