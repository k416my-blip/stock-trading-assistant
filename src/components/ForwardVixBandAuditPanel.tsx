import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVixBandAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVixBandAuditReport | null;
  loading?: boolean;
};

export function ForwardVixBandAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX 4区分</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX 4区分</Text>
      <Text style={styles.subtitle}>区分計 {report.bandedCount}件</Text>
      {report.bands.map((b) => (
        <View key={b.bandId} style={styles.row}>
          <Text style={styles.label}>
            {b.labelJa}: {b.tradeCount} · {b.winRatePct}% · R{b.avgReturnPct ?? '—'}%
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
