import { StyleSheet, Text } from 'react-native';
import type { ForwardBacktestQualityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardBacktestQualityAuditReport | null;
  loading?: boolean;
};

export function ForwardBacktestQualityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その6 · バックテスト品質</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const cap1M = report.capitalAudits.find((c) => c.capitalJpy === 1_000_000);
  const cap3M = report.capitalAudits.find((c) => c.capitalJpy === 3_000_000);
  const cap10M = report.capitalAudits.find((c) => c.capitalJpy === 10_000_000);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その6 · バックテスト品質</Text>
      <Text style={styles.subtitle}>
        VIX≥24 · {report.cohortTradeCount}件 · 判定【{report.feasibilityGrade}】
      </Text>
      <Text style={styles.line}>
        同日最大{report.maxSameDaySignalCount}件 · 同時保有最大{report.maxConcurrentHoldings}件
      </Text>
      <Text style={styles.line}>
        100万: 実行{cap1M?.executedCount ?? '—'}/{report.cohortTradeCount} · 300万:
        {cap3M?.executedCount ?? '—'} · 1000万:{cap10M?.executedCount ?? '—'}
      </Text>
      <Text style={styles.line}>
        重複除外 {report.dedupTradeCount}件 · 勝率{report.dedupWinRatePct}% · 累積
        {report.dedupCumulativeReturnPct}%
      </Text>
      {report.etfPerformance.map((e) => (
        <Text key={e.symbol} style={styles.line}>
          {e.symbol}: {e.tradeCount}件 WR{e.winRatePct}% R{e.avgReturnPct ?? '—'}% DD
          {e.avgMaxDrawdownPct ?? '—'}%
        </Text>
      ))}
      <Text style={styles.verdict}>{report.feasibilityVerdictJa}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
