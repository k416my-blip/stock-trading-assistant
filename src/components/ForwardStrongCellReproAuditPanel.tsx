import { StyleSheet, Text, View } from 'react-native';
import type { ForwardStrongCellReproAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardStrongCellReproAuditReport | null;
  loading?: boolean;
};

export function ForwardStrongCellReproAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル再現性</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最強セル再現性</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最強セル再現性監査</Text>
      <Text style={styles.subtitle}>
        学習 {report.trainFrom}～{report.trainTo} · 検証 {report.validFrom}～{report.validTo}
      </Text>

      {report.rows.map((r) => (
        <View key={r.scenarioId} style={styles.block}>
          <Text style={styles.scenario}>{r.labelJa}</Text>
          <Text style={styles.line}>
            学習 {r.train.tradeCount}件 · {r.train.winRatePct}% · R{r.train.avgReturnPct ?? '—'}% ·{' '}
            {r.train.avgHoldDays ?? '—'}日
          </Text>
          <Text style={styles.line}>
            検証 {r.validation.tradeCount}件 · {r.validation.winRatePct}% · R
            {r.validation.avgReturnPct ?? '—'}% · {r.validation.avgHoldDays ?? '—'}日
          </Text>
          <Text style={styles.diff}>
            差分 件{r.diff.tradeCount >= 0 ? '+' : ''}
            {r.diff.tradeCount} · 勝率{r.diff.winRatePct ?? '—'} · R{r.diff.avgReturnPct ?? '—'}% ·
            保有{r.diff.avgHoldDays ?? '—'}日
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
  block: { marginTop: theme.spacing.sm },
  scenario: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  diff: { color: theme.colors.primary, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
