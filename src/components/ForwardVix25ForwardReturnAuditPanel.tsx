import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix25ForwardReturnAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25ForwardReturnAuditReport | null;
  loading?: boolean;
};

export function ForwardVix25ForwardReturnAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 先読みR</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥25 先読みR</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥25 エントリー後リターン</Text>
      <Text style={styles.subtitle}>{report.cohortCount}件</Text>
      {report.horizons.map((h) => (
        <View key={h.horizonDays} style={styles.row}>
          <Text style={styles.label}>{h.labelJa}</Text>
          <Text style={styles.line}>
            均{h.avgReturnPct ?? '—'}% · 中央{h.medianReturnPct ?? '—'}% · {h.winRatePct}%
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
  row: { marginTop: theme.spacing.sm },
  label: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  line: { color: theme.colors.textMuted, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
