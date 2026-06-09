import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardStrongCellExclListingAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardStrongCellExclListingAuditReport | null;
  loading?: boolean;
};

export function ForwardStrongCellExclListingAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル除外後一覧</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル除外後一覧</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最強セル 4月除外後</Text>
      <Text style={styles.subtitle}>
        {report.remainingCount}件 / 除外{report.excludedCount}（両月除外→残0）
      </Text>

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.rows.map((r, i) => (
          <View key={`${r.signalDate}-${r.symbol}`} style={styles.row}>
            <Text style={styles.label}>
              {i + 1}. {r.signalDate} · {r.symbol}
            </Text>
            <Text style={styles.line}>
              R{r.returnPct}% · {r.holdDays}日 · MACD {r.macdHistPct} · ADX {r.adx14} · 52w {r.dist52wPct}%
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
  scroll: { maxHeight: 400, marginTop: theme.spacing.sm },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: 10 },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
