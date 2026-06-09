import { StyleSheet, Text } from 'react-native';
import type { ForwardSymbolContributionAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSymbolContributionAuditReport | null;
  loading?: boolean;
};

export function ForwardSymbolContributionAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その37 · 銘柄寄与度</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = [...report.symbolRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その37 · 銘柄寄与度</Text>
      <Text style={styles.subtitle}>
        {report.executedTradeCount}件 · 推奨{report.recommendedComposition.join('+')} ·{' '}
        {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.line}>{report.answerCJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      {top ? (
        <Text style={styles.line}>
          利益1位 {top.symbol}: 累積{top.cumulativeReturnPct}% · 寄与{top.contributionPct}%
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.operationalNoteJa}</Text>
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
