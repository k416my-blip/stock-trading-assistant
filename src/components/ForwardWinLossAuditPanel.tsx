import { StyleSheet, Text, View } from 'react-native';
import type { ForwardWinLossAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardWinLossAuditReport | null;
  loading?: boolean;
};

function StatRow({ label, stats }: { label: string; stats: ForwardWinLossAuditReport['winners'] }) {
  return (
    <Text style={styles.line}>
      {label}（{stats.count}件）: ADX {stats.avgAdx ?? '—'} · MACD {stats.avgMacd ?? '—'}% · 52w{' '}
      {stats.avgDist52 ?? '—'}% · 保有 {stats.avgHoldDays ?? '—'}日
    </Text>
  );
}

export function ForwardWinLossAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>勝ち vs 負け 比較</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>勝ち vs 負け 比較</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>勝ち vs 負け 比較監査</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · 勝ち {report.winCount} / 負け {report.lossCount}
      </Text>

      <Text style={styles.section}>1. 勝ち組平均</Text>
      <StatRow label="勝ち" stats={report.winners} />

      <Text style={styles.section}>2. 負け組平均</Text>
      <StatRow label="負け" stats={report.losers} />

      <Text style={styles.section}>3. 負け一覧</Text>
      {report.lossTrades.map((t) => (
        <Text key={t.id} style={styles.tradeRow}>
          {t.signalDate} {t.symbol} R{t.returnPct}% · ADX{t.adx14} · MACD{t.macdHistPct}% · 52w
          {t.dist52wPct}%
        </Text>
      ))}

      <Text style={styles.section}>4. 負け組共通特徴</Text>
      <Text style={styles.insight}>{report.loserCommonTraitsJa}</Text>

      <Text style={styles.section}>5. 勝ち組との違い</Text>
      <Text style={styles.insight}>{report.comparison.summaryJa}</Text>
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
    marginBottom: theme.spacing.xs,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs },
  tradeRow: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  insight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
  },
});
