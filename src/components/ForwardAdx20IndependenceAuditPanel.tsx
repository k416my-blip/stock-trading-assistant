import { StyleSheet, Text } from 'react-native';
import type { ForwardAdx20IndependenceAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdx20IndependenceAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  genuine_independence: '独立稼ぎ',
  cluster_concentrated: '局面集中',
  mixed: '混合',
};

export function ForwardAdx20IndependenceAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その20 · ADX20独立性</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その20 · ADX20独立性</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · {report.targetTradeCount}件→
        {report.independentEventCount}イベント
      </Text>
      <Text style={styles.line}>
        トレード WR{report.tradeWinRatePct}% 累積{report.tradeCumulativeReturnPct}% / イベント WR
        {report.eventWinRatePct}% 累積{report.eventCumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        圧縮比{report.compressionRatio} · 年最大{report.topYearTradeSharePct}% · 連続
        {report.consecutiveStreaks.length}クラスター
      </Text>
      <Text style={styles.verdict}>{report.verdictJa}</Text>
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
