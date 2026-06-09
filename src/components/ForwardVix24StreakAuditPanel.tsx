import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ForwardVix24StreakAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24StreakAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24StreakAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 連敗</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 連敗監査</Text>
      <Text style={styles.subtitle}>
        {report.cohortTradeCount}件 · 連勝{report.maxConsecutiveWins} · 連敗
        {report.maxConsecutiveLosses} · 累積{report.finalCumulativeReturnPct}%
      </Text>

      {report.allLossTrades.length > 0 && (
        <View style={styles.block}>
          <Text style={styles.section}>敗 {report.lossCount}件</Text>
          {report.allLossTrades.map((t) => (
            <Text key={`${t.signalDate}-${t.symbol}`} style={styles.line}>
              {t.signalDate} {t.symbol} R{t.returnPct}%
            </Text>
          ))}
        </View>
      )}

      <ScrollView style={styles.scroll} nestedScrollEnabled>
        {report.curve.map((p) => (
          <Text key={`${p.index}-${p.symbol}`} style={styles.line}>
            {p.index}. {p.signalDate} {p.symbol} → {p.cumulativeReturnPct}%
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
  section: { color: theme.colors.text, fontSize: 10, fontWeight: '600' },
  scroll: { maxHeight: 200, marginTop: theme.spacing.sm },
  line: { color: theme.colors.text, fontSize: 9 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
