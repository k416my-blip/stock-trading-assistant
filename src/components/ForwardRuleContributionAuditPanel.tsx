import { StyleSheet, Text } from 'react-native';
import type { ForwardRuleContributionAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRuleContributionAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  multi_rule_critical: '複数ルール必須',
  clear_contributor: '特定ルール高寄与',
  mixed_contribution: '寄与度に差',
  mixed: '混合',
};

export function ForwardRuleContributionAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その16 · ルール寄与</Text>
        <Text style={styles.muted}>{loading ? 'アブレーション実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const b = report.baseline;
  const topDeg = report.degradations
    .filter((d) => d.scenarioId !== 'baseline')
    .sort((a, x) => (x.overallDegradationPct ?? 0) - (a.overallDegradationPct ?? 0))[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その16 · ルール寄与</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 基準{b.tradeCount}件
      </Text>
      <Text style={styles.line}>
        基準: WR{b.winRatePct}% 累積{b.cumulativeReturnPct}% 効率{b.profitEfficiency ?? '—'}
      </Text>
      {topDeg ? (
        <Text style={styles.line}>
          最大悪化: {topDeg.labelJa} 総合{topDeg.overallDegradationPct ?? '—'}%
        </Text>
      ) : null}
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
