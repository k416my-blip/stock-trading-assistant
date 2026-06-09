import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardSpyVixDist52ComboAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSpyVixDist52ComboAuditReport | null;
  loading?: boolean;
};

export function ForwardSpyVixDist52ComboAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPY/VIX/52週 組合せ</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPY/VIX/52週 組合せ</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>SPY/VIX/52週 条件比較</Text>
      <Text style={styles.subtitle}>96件 · 7パターン</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.rows.map((r) => (
          <View key={r.comboId} style={styles.row}>
            <Text style={styles.label}>
              {r.labelJa} ({r.tradeCount})
            </Text>
            <Text style={styles.line}>
              {r.winRatePct}% · R{r.avgReturnPct ?? '—'}% · S{r.sharpe ?? '—'} · 満{r.maxHoldRatePct}%
            </Text>
          </View>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  scroll: { maxHeight: 220, marginTop: theme.spacing.sm },
  row: { marginTop: 6 },
  label: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  line: { color: theme.colors.textMuted, fontSize: 9, marginTop: 1 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
