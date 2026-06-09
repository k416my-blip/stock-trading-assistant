import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardVix24EffectivenessAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24EffectivenessAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24EffectivenessAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 有効性</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 有効性検証</Text>
      <Text style={styles.subtitle}>{report.cohortTradeCount}件 · 監査のみ</Text>
      <Text style={styles.line}>
        均DD {report.avgMaxDrawdownPct ?? '—'}% · 保有中央値 {report.holdingDaysMedian ?? '—'}日
      </Text>
      <Text style={styles.line}>
        翌日+ {report.nextDayPositiveRatePct ?? '—'}% · 5日勝率 {report.fiveDayWinRatePct ?? '—'}%
      </Text>
      <View style={styles.block}>
        {report.lookaheadChecks.map((c) => (
          <Text key={c.id} style={styles.check}>
            {c.passed ? '✓' : '✗'} {c.labelJa}
          </Text>
        ))}
      </View>
      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.worst10Drawdown.slice(0, 5).map((t) => (
          <Text key={`${t.entryDate}-${t.ticker}`} style={styles.line}>
            {t.entryDate} {t.ticker} DD{t.maxDrawdown}%
          </Text>
        ))}
      </ScrollView>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  block: { marginTop: theme.spacing.xs },
  check: { color: theme.colors.text, fontSize: 9 },
  scroll: { maxHeight: 120, marginTop: theme.spacing.xs },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
