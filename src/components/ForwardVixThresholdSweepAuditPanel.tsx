import { ScrollView, StyleSheet, Text } from 'react-native';
import type { ForwardVixThresholdSweepAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixThresholdSweepAuditReport | null;
  loading?: boolean;
};

export function ForwardVixThresholdSweepAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX閾値スイープ</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX閾値スイープ</Text>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.rows.map((r) => (
          <Text key={r.vixThreshold} style={styles.line}>
            ≥{r.vixThreshold}: {r.tradeCount}件 · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}% · S
            {r.sharpe ?? '—'}
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  scroll: { maxHeight: 180, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
