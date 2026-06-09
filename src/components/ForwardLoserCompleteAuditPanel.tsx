import { StyleSheet, Text, View } from 'react-native';
import type { ForwardLoserCompleteAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardLoserCompleteAuditReport | null;
  loading?: boolean;
};

export function ForwardLoserCompleteAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>負けトレード完全監査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>負けトレード完全監査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>負けトレード完全監査</Text>
      <Text style={styles.subtitle}>
        {report.totalTrades}件 · 負け {report.lossCount}件
      </Text>

      <Text style={styles.section}>負け一覧</Text>
      {report.loserRows.map((t) => (
        <Text key={t.id} style={styles.row}>
          {t.signalDate} {t.symbol} R{t.returnPct}% · {t.holdDays}日 · {t.spyRegimeLabel} · ADX
          {t.adx14} · {t.macdHistPct}% · 52w{t.dist52wPct}%
        </Text>
      ))}

      <Text style={styles.section}>勝ち vs 負け 差分</Text>
      <Text style={styles.diff}>ADX 差 {report.diff.adx ?? '—'}</Text>
      <Text style={styles.diff}>MACD 差 {report.diff.macd ?? '—'}%</Text>
      <Text style={styles.diff}>52w 差 {report.diff.dist52 ?? '—'}%</Text>
      <Text style={styles.diff}>SPY down比率 差 {report.diff.spyDownPct ?? '—'}pt</Text>
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
  row: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 16 },
  diff: { color: theme.colors.primary, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
