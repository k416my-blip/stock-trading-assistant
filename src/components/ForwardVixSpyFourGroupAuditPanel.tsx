import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVixSpyFourGroupAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixSpyFourGroupAuditReport | null;
  loading?: boolean;
};

export function ForwardVixSpyFourGroupAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX×SPY 4群</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX×SPY 4群</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX×SPY 4群監査</Text>
      {report.groups.map((g) => (
        <View key={g.groupId} style={styles.row}>
          <Text style={styles.groupId}>{g.groupId}</Text>
          <Text style={styles.line}>
            {g.tradeCount}件 · {g.winRatePct}% · R{g.avgReturnPct ?? '—'}% · 満了
            {g.maxHoldRatePct}%
          </Text>
          <Text style={styles.mutedLine}>
            MACD {g.avgMacd ?? '—'} · 52w {g.avgDist52 ?? '—'}% · ADX {g.avgAdx ?? '—'}
          </Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  row: { marginTop: theme.spacing.sm },
  groupId: { color: theme.colors.accent, fontWeight: '700', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: 10, marginTop: 2 },
  mutedLine: { color: theme.colors.textMuted, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
