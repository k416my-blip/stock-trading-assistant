import { StyleSheet, Text, View } from 'react-native';
import type { ForwardFourFactorComboAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardFourFactorComboAuditReport | null;
  loading?: boolean;
};

export function ForwardFourFactorComboAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4条件組み合わせ</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>4条件組み合わせ</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  const s = report.spotlightDownAdx35MacdPosDist10;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>4条件組み合わせ監査</Text>
      <Text style={styles.subtitle}>
        {report.totalTrades}件 · {report.minCellTrades}件以上 {report.cellsMinCount.length}セル
      </Text>

      <Text style={styles.section}>明示: down × ADX≥35 × MACD+ × 52w≤-10%</Text>
      <Text style={styles.spotlight}>
        {s.tradeCount}件 · 勝率 {s.winRatePct}% · 均R {s.avgReturnPct ?? '—'}% · 保有{' '}
        {s.avgHoldDays ?? '—'}日
      </Text>

      <Text style={styles.section}>利益率 上位10（3件以上）</Text>
      {report.top10ByReturn.map((c, i) => (
        <Text key={c.labelJa} style={styles.cellRow}>
          {i + 1}. {c.tradeCount}件 R{c.avgReturnPct ?? '—'}% · {c.labelJa}
        </Text>
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
  spotlight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.xs,
    lineHeight: 20,
  },
  cellRow: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 16, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
