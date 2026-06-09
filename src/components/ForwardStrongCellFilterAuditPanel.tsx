import { StyleSheet, Text, View } from 'react-native';
import type { ForwardStrongCellFilterAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardStrongCellFilterAuditReport | null;
  loading?: boolean;
};

export function ForwardStrongCellFilterAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル除外監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル除外監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最強セル適用（監査）</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件 · 負け{report.totalLosers}</Text>

      <View style={styles.row}>
        <Text style={styles.label}>除外</Text>
        <Text style={styles.line}>
          {report.excludedCount}件 ({report.excludedRatePct}%) · 負け除外 {report.excludedLosers}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>残存</Text>
        <Text style={styles.line}>
          {report.remainingCount}件 ({report.remainingRatePct}%) · 勝{report.remainingWinners} 負
          {report.remainingLosers}
        </Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>新成績</Text>
        <Text style={styles.line}>
          勝率 {report.newWinRatePct}% · Sharpe {report.newSharpe ?? '—'}
        </Text>
        <Text style={styles.muted}>
          適用前 勝率{report.baselineWinRatePct}% · Sharpe {report.baselineSharpe ?? '—'}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  row: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.xs,
    marginTop: theme.spacing.xs,
  },
  label: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.xs },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
