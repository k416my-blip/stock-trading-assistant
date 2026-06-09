import { StyleSheet, Text, View } from 'react-native';
import { FORWARD_ETF_UNIVERSE } from '../constants/forwardValidation';
import type { ForwardSpyDownClusterAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSpyDownClusterAuditReport | null;
  loading?: boolean;
};

function GroupBlock({ g }: { g: ForwardSpyDownClusterAuditReport['spyDown'] }) {
  return (
    <View style={styles.block}>
      <Text style={styles.groupTitle}>{g.labelJa}</Text>
      <Text style={styles.line}>
        {g.tradeCount}件 · 勝率 {g.winRatePct}% · R{g.avgReturnPct ?? '—'}% · 保有{' '}
        {g.avgHoldDays ?? '—'}日
      </Text>
      <Text style={styles.muted}>
        ADX {g.avgAdx ?? '—'} · MACD {g.avgMacd ?? '—'}% · 52w {g.avgDist52 ?? '—'}%
      </Text>
      <Text style={styles.muted}>
        ETF {FORWARD_ETF_UNIVERSE.map((s) => `${s} ${g.etfCompositionPct[s]}%`).join(' · ')}
      </Text>
      {g.monthly.map((m) => (
        <Text key={m.yearMonth} style={styles.monthRow}>
          {m.yearMonth}: {m.tradeCount}件 · {m.winRatePct}% · R{m.avgReturnPct ?? '—'}%
        </Text>
      ))}
    </View>
  );
}

export function ForwardSpyDownClusterAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPY down 調査</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>SPY down 調査</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>SPY down クラスター調査</Text>
      <Text style={styles.subtitle}>
        {report.totalTrades}件 · down {report.spyDown.tradeCount} / その他{' '}
        {report.other.tradeCount}
      </Text>

      <GroupBlock g={report.spyDown} />
      <GroupBlock g={report.other} />

      <Text style={styles.section}>2025年4〜6月クラスター</Text>
      {report.clusterMonths.map((c) => (
        <GroupBlock key={c.labelJa} g={c} />
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
  block: { marginTop: theme.spacing.sm },
  groupTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  line: { color: theme.colors.text, fontSize: theme.fontSize.xs, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10, marginTop: 2 },
  monthRow: { color: theme.colors.primary, fontSize: 10, marginLeft: 8, marginTop: 2 },
});
