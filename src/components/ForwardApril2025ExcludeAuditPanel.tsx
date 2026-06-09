import { StyleSheet, Text, View } from 'react-native';
import type { ForwardApril2025ExcludeAuditReport, ForwardAprilExcludeCompareRow } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardApril2025ExcludeAuditReport | null;
  loading?: boolean;
};

function CompareLine({ row }: { row: ForwardAprilExcludeCompareRow }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{row.label}</Text>
      <Text style={styles.line}>前 {row.before.tradeCount}件 · {row.before.winRatePct}% · R{row.before.avgReturnPct ?? '—'}%</Text>
      <Text style={styles.after}>後 {row.after.tradeCount}件 · {row.after.winRatePct}% · R{row.after.avgReturnPct ?? '—'}%</Text>
    </View>
  );
}

export function ForwardApril2025ExcludeAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4月除外監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4月除外監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>2025年4月除外監査</Text>
      <Text style={styles.subtitle}>
        除外 {report.excludedCount}件 · 残り {report.remainingCount}/{report.totalTrades}件
      </Text>

      <Text style={styles.section}>全体</Text>
      <CompareLine row={report.overall} />

      <Text style={styles.section}>レジーム別</Text>
      {report.regimeRows.map((r) => (
        <CompareLine key={r.label} row={r} />
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
  },
  row: { marginTop: theme.spacing.xs },
  rowLabel: { color: theme.colors.text, fontSize: theme.fontSize.xs, fontWeight: '600' },
  line: { color: theme.colors.textMuted, fontSize: 10 },
  after: { color: theme.colors.primary, fontSize: 10 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
