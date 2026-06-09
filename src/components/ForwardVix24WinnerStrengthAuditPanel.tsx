import { StyleSheet, Text } from 'react-native';
import type { ForwardVix24WinnerStrengthAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24WinnerStrengthAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24WinnerStrengthAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 38勝分析</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 38勝 強度分析</Text>
      <Text style={styles.subtitle}>{report.cohortTradeCount}件 · 監査のみ</Text>
      <Text style={styles.line}>
        相関 VIX{report.vixReturnCorrelation ?? '—'} ADX{report.adxReturnCorrelation ?? '—'} MACD
        {report.macdReturnCorrelation ?? '—'}
      </Text>
      {report.vixBuckets.map((b) => (
        <Text key={b.labelJa} style={styles.line}>
          VIX {b.labelJa}: {b.tradeCount}件 R{b.avgReturnPct ?? '—'}%
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
