import { StyleSheet, Text, View } from 'react-native';
import type { ForwardTrailingStopAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardTrailingStopAuditReport | null;
  loading?: boolean;
};

export function ForwardTrailingStopAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>TP vs トレーリング</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>TP vs トレーリング</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>固定TP +5% vs トレーリング</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件 · 反実仮想</Text>

      {report.scenarios.map((s) => (
        <View key={s.id} style={styles.row}>
          <Text style={styles.label}>{s.labelJa}</Text>
          <Text style={styles.line}>
            {s.tradeCount}件 · {s.winRatePct}% · R{s.avgReturnPct ?? '—'}% · Sharpe {s.sharpe ?? '—'}
          </Text>
          <Text style={styles.muted}>
            MaxDD {s.maxDrawdownPct ?? '—'}% · 満了 {s.maxHoldRatePct}%
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
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
