import { StyleSheet, Text } from 'react-native';
import type { ForwardWalkForwardAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardWalkForwardAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  none: '過剰適合なし',
  mild: '軽度の乖離',
  suspected: '過剰適合の疑い',
  clear: '過剰適合（強）',
};

export function ForwardWalkForwardAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その10 · WF検証</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const agg = report.aggregateTest;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その10 · WF検証</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.overfitVerdict] ?? report.overfitVerdict} · 劣化
        {report.avgWinRateDegradationPct ?? '—'}%
      </Text>
      <Text style={styles.line}>
        統合検証: {agg.tradeCount}件 WR{agg.winRatePct}% 累積{agg.cumulativeReturnPct}%
      </Text>
      {report.folds
        .filter((f) => f.test.tradeCount > 0)
        .map((f) => (
          <Text key={f.foldId} style={styles.line}>
            {f.testYear}: {f.test.tradeCount}件 WR{f.test.winRatePct}% 劣化
            {f.winRateDegradationPct ?? '—'}%
          </Text>
        ))}
      <Text style={styles.verdict}>{report.overfitVerdictJa}</Text>
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
