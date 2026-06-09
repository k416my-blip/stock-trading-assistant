import { StyleSheet, Text } from 'react-native';
import type { ForwardFinalRulesAblationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardFinalRulesAblationAuditReport | null;
  loading?: boolean;
};

export function ForwardFinalRulesAblationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その26 · 総合アブレーション</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const topRule = [...report.ruleRankings].sort((a, b) => a.profitRank - b.profitRank)[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その26 · 総合アブレーション</Text>
      <Text style={styles.subtitle}>
        ベース {report.baseline.tradeCount}件 · 累積{report.baseline.cumulativeReturnPct}% · WR
        {report.baseline.winRatePct}%
      </Text>
      <Text style={styles.line}>
        最重要={topRule?.labelJa ?? '—'} · 必須
        {report.tierRows.filter((t) => t.tier === 'required').length} /
        推奨{report.tierRows.filter((t) => t.tier === 'recommended').length} /
        任意{report.tierRows.filter((t) => t.tier === 'optional').length}
      </Text>
      <Text style={styles.verdict}>{report.answer5Ja}</Text>
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
