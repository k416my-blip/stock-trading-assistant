import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix25SpyEtfForwardReturnAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25SpyEtfForwardReturnAuditReport | null;
  loading?: boolean;
};

export function ForwardVix25SpyEtfForwardReturnAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX25×SPY ETF別R</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX25×SPY ETF別リターン</Text>
      <Text style={styles.subtitle}>{report.cohortCount}件</Text>
      {report.byEtf.map((r) => (
        <View key={r.symbol} style={styles.row}>
          <Text style={styles.line}>
            {r.symbol} {r.tradeCount}件 · 1d{r.avgReturn1dPct ?? '—'}% · 10d{r.avgReturn10dPct ?? '—'}%
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
  line: { color: theme.colors.text, fontSize: 9 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
