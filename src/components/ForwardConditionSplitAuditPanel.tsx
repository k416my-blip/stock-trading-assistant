import { StyleSheet, Text, View } from 'react-native';
import type { ForwardConditionSplitAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardConditionSplitAuditReport | null;
  loading?: boolean;
};

export function ForwardConditionSplitAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>3条件二元分割</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>3条件二元分割</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>3条件二元分割監査</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>

      {report.comparisons.map((c) => (
        <View key={c.id} style={styles.block}>
          <Text style={styles.blockTitle}>{c.labelJa}</Text>
          {[c.groupA, c.groupB].map((g) => (
            <View key={g.labelJa} style={styles.row}>
              <Text style={styles.label}>{g.labelJa}</Text>
              <Text style={styles.line}>
                {g.tradeCount}件 · {g.winRatePct}% · R{g.avgReturnPct ?? '—'}% · Sharpe {g.sharpe ?? '—'}
              </Text>
              <Text style={styles.muted}>満了 {g.maxHoldRatePct}%</Text>
            </View>
          ))}
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  block: { marginTop: theme.spacing.sm },
  blockTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  row: { marginTop: 4 },
  label: { color: theme.colors.text, fontSize: theme.fontSize.xs, fontWeight: '500' },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 1 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 1 },
});
