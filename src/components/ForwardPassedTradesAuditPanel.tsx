import { StyleSheet, Text, View } from 'react-native';
import type { ForwardPassedTradeAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardPassedTradeAuditReport | null;
  loading?: boolean;
};

export function ForwardPassedTradesAuditPanel({ report, loading }: Props) {
  if (loading) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>条件適合96件 分析</Text>
        <Text style={styles.muted}>集計中…</Text>
      </Card>
    );
  }

  if (!report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>条件適合96件 分析</Text>
        <Text style={styles.muted}>Yahooデータ未取得</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>条件適合トレード分析</Text>
      <Text style={styles.subtitle}>
        {report.fromDate} ～ {report.toDate} · {report.tradeCount}件 · 勝率 {report.winRatePct}%
      </Text>

      <Text style={styles.section}>エントリー時平均</Text>
      <Text style={styles.line}>
        ADX {report.entryStats.avgAdx ?? '—'} · MACD {report.entryStats.avgMacd ?? '—'}% · 52w{' '}
        {report.entryStats.avgDist52 ?? '—'}%
      </Text>
      <Text style={styles.line}>
        保有 {report.avgHoldDays ?? '—'}日 · 利益率 {report.avgReturnPct ?? '—'}%
      </Text>

      <Text style={styles.section}>ETF別成績</Text>
      {report.perEtf.map((e) => (
        <Text key={e.symbol} style={styles.muted}>
          {e.symbol}: {e.tradeCount}件 · 勝率{e.winRatePct}% · 均R{e.avgReturnPct ?? '—'}% · 保有
          {e.avgHoldDays ?? '—'}日
        </Text>
      ))}

      <Text style={styles.section}>全トレード一覧 ({report.tradeCount})</Text>
      {report.trades.map((t) => (
        <Text key={t.id} style={styles.tradeRow}>
          {t.signalDate} {t.symbol} R{t.returnPct}% · ADX{t.adx14} MACD{t.macdHistPct}% 52w
          {t.dist52wPct}% · {t.holdDays}日 · {t.exitReason}
        </Text>
      ))}

      <Text style={styles.section}>上位20勝ちトレード — 共通特徴</Text>
      {report.top20Winners.map((t, i) => (
        <Text key={t.id} style={styles.tradeRow}>
          #{i + 1} {t.signalDate} {t.symbol} +{t.returnPct}% · ADX{t.adx14} · {t.bucket}
        </Text>
      ))}
      <Text style={styles.insight}>{report.top20Insight.summaryJa}</Text>
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
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, lineHeight: 18 },
  tradeRow: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 16 },
  insight: {
    color: theme.colors.primary,
    fontSize: theme.fontSize.xs,
    lineHeight: 18,
    marginTop: theme.spacing.sm,
  },
});
