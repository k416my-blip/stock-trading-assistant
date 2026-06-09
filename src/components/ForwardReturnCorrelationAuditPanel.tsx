import { StyleSheet, Text, View } from 'react-native';
import type { ForwardReturnCorrelationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardReturnCorrelationAuditReport | null;
  loading?: boolean;
};

export function ForwardReturnCorrelationAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>指標×利益率 相関</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>指標×利益率 相関</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>指標×利益率 相関監査</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · {report.tradeCount}件
      </Text>

      {report.metrics.map((m) => (
        <View key={m.id} style={styles.block}>
          <Text style={styles.metricLabel}>{m.labelJa}</Text>
          <Text style={styles.line}>r = {m.correlation ?? '—'}</Text>
          <Text style={styles.muted}>
            上位20 均{m.top20Avg ?? '—'} / 中央{m.top20Median ?? '—'}
          </Text>
          <Text style={styles.muted}>
            下位20 均{m.bottom20Avg ?? '—'} / 中央{m.bottom20Median ?? '—'} · 差{' '}
            {m.medianGapTopMinusBottom ?? '—'}
          </Text>
        </View>
      ))}

      <Text style={styles.section}>説明力ランキング</Text>
      {report.impactRanking.map((r) => (
        <Text key={r.metricId} style={styles.rankRow}>
          {r.rank}. {r.labelJa} |r|={r.absCorrelation ?? '—'} (r={r.correlation ?? '—'})
        </Text>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  block: { marginTop: theme.spacing.sm },
  metricLabel: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 2 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
  },
  rankRow: { color: theme.colors.primary, fontSize: theme.fontSize.xs, lineHeight: 18 },
});
