import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix24ExitCompareAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24ExitCompareAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24ExitCompareAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX24出口比較</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 出口A〜E</Text>
      <Text style={styles.subtitle}>{report.cohortCount}件 · 反実仮想</Text>
      {report.rows.map((r) => (
        <View key={r.exitId} style={styles.row}>
          <Text style={styles.label}>
            {r.labelJa}: {r.tradeCount} · {r.winRatePct}% · R{r.avgReturnPct ?? '—'}%
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
  row: { marginTop: 4 },
  label: { color: theme.colors.text, fontSize: 9 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
