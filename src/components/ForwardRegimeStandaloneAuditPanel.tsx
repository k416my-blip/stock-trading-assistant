import { StyleSheet, Text, View } from 'react-native';
import { FORWARD_ETF_UNIVERSE } from '../constants/forwardValidation';
import type { ForwardRegimeStandaloneAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRegimeStandaloneAuditReport | null;
  loading?: boolean;
};

export function ForwardRegimeStandaloneAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>レジーム単独説明力</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>レジーム単独説明力</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>SPYレジーム単独説明力</Text>
      <Text style={styles.subtitle}>{report.totalTrades}件</Text>

      {report.groups.map((g) => (
        <View key={g.labelJa} style={styles.block}>
          <Text style={styles.groupTitle}>{g.labelJa}</Text>
          <Text style={styles.line}>
            {g.tradeCount}件 · {g.winRatePct}% · R{g.avgReturnPct ?? '—'}% · {g.avgHoldDays ?? '—'}日
          </Text>
          <Text style={styles.muted}>
            利確{g.takeProfitRatePct}% · 満了{g.maxHoldRatePct}%
          </Text>
          <Text style={styles.muted}>
            {FORWARD_ETF_UNIVERSE.map((e) => `${e} ${g.etfPct[e]}%`).join(' · ')}
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
