import { StyleSheet, Text, View } from 'react-native';
import type { ForwardMacdDist52DedupExclSpringAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMacdDist52DedupExclSpringAuditReport | null;
  loading?: boolean;
};

export function ForwardMacdDist52DedupExclSpringAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4〜5月イベント除外</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4〜5月イベント除外</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const r = report.remaining;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>4〜5月除外後</Text>
      <Text style={styles.subtitle}>
        {report.excludedEventCount}件除外 → {r.eventCount}件
      </Text>
      <View style={styles.row}>
        <Text style={styles.line}>
          勝率 {r.winRatePct}% · R{r.avgReturnPct ?? '—'}% · 累積 {r.cumulativeReturnPct}%
        </Text>
        <Text style={styles.muted}>
          Sharpe {r.sharpe ?? '—'} · 連敗 {r.maxConsecutiveLosses} · DD {r.maxDrawdownPct}%
        </Text>
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
