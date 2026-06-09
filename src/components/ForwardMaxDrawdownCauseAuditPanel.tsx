import { StyleSheet, Text } from 'react-native';
import type { ForwardMaxDrawdownAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMaxDrawdownAuditReport | null;
  loading?: boolean;
};

export function ForwardMaxDrawdownCauseAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その40 · 最大DD原因</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = report.ddRankingTop10[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その40 · 最大DD原因</Text>
      <Text style={styles.subtitle}>
        {report.executedTradeCount}件 · DD{report.portfolioMaxDrawdownPct}%（曲線
        {report.equityCurveMaxDrawdownPct}%）·{' '}
        {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerCJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      {top ? (
        <Text style={styles.line}>
          DD1位 {top.startDate}→{top.troughDate}: {top.depthPct}% · 回復
          {top.recoveryDays != null ? `${top.recoveryDays}日` : '—'}
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
