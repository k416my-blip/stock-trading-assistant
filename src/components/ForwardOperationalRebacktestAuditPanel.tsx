import { StyleSheet, Text } from 'react-native';
import type { ForwardOperationalRebacktestAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardOperationalRebacktestAuditReport | null;
  loading?: boolean;
};

export function ForwardOperationalRebacktestAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その7 · 実運用再BT</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const { operational: op, theoretical: th, comparison } = report;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その7 · 実運用再BT</Text>
      <Text style={styles.subtitle}>
        判定【{report.feasibilityGrade}】 · 実運用{op.tradeCount}件 / 理論{th.tradeCount}件
      </Text>
      <Text style={styles.line}>
        実運用: WR{op.winRatePct}% · R{op.avgReturnPct ?? '—'}% · 累積{op.cumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        理論: WR{th.winRatePct}% · R{th.avgReturnPct ?? '—'}% · 累積{th.cumulativeReturnPct}%
      </Text>
      {comparison.slice(0, 4).map((r) => (
        <Text key={r.metricJa} style={styles.line}>
          {r.metricJa}: {r.operationalValue} vs {r.theoreticalValue}
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
