import { StyleSheet, Text, View } from 'react-native';
import { FORWARD_ETF_UNIVERSE } from '../constants/forwardValidation';
import type { ForwardDist52StandaloneAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardDist52StandaloneAuditReport | null;
  loading?: boolean;
};

export function ForwardDist52StandaloneAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>52w乖離単独説明力</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>52w乖離単独説明力</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>52週乖離単独説明力</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>

      {report.buckets.map((b) => (
        <View key={b.id} style={styles.block}>
          <Text style={styles.groupTitle}>{b.labelJa}</Text>
          <Text style={styles.line}>
            {b.tradeCount}件 · {b.winRatePct}% · R{b.avgReturnPct ?? '—'}% · {b.avgHoldDays ?? '—'}日
          </Text>
          <Text style={styles.muted}>
            利確{b.takeProfitRatePct}% · 満了{b.maxHoldRatePct}%
          </Text>
          <Text style={styles.muted}>
            {FORWARD_ETF_UNIVERSE.map((e) => `${e} ${b.etfPct[e]}%`).join(' · ')}
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
  groupTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
});
