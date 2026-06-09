import { StyleSheet, Text } from 'react-native';
import type { ForwardMarketDependencyAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMarketDependencyAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  universal_reversal: '汎用リバーサル',
  us_specific: '米国特有',
  partial_universal: '部分的再現',
  mixed: '混合/不足',
};

export function ForwardMarketDependencyAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その13 · 市場依存</Text>
        <Text style={styles.muted}>{loading ? '地域ETF取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const us = report.usBaseline;
  const europe = report.cohorts.find((c) => c.cohortId === 'europe');
  const japan = report.cohorts.find((c) => c.cohortId === 'japan');
  const global = report.cohorts.find((c) => c.cohortId === 'global');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その13 · 市場依存</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.dependencyVerdict] ?? report.dependencyVerdict}
      </Text>
      <Text style={styles.line}>
        米国: {us.tradeCount}件 WR{us.winRatePct}% 累積{us.cumulativeReturnPct}%
      </Text>
      {europe ? (
        <Text style={styles.line}>
          欧州: {europe.tradeCount}件 WR{europe.winRatePct}% 累積{europe.cumulativeReturnPct}%
        </Text>
      ) : null}
      {japan ? (
        <Text style={styles.line}>
          日本: {japan.tradeCount}件 WR{japan.winRatePct}% 累積{japan.cumulativeReturnPct}%
        </Text>
      ) : null}
      {global ? (
        <Text style={styles.line}>
          全世界: {global.tradeCount}件 WR{global.winRatePct}% 累積{global.cumulativeReturnPct}%
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.dependencyVerdictJa}</Text>
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
