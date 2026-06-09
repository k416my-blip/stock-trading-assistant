import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4RebalanceAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4RebalanceAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4RebalanceAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その82 · v4リバランス</Text>
        <Text style={styles.muted}>{loading ? '比較実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const riskPred = report.predictions.risk_min;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その82 · 実保有 vs v4推奨</Text>
      <Text style={styles.subtitle}>
        {report.holdingsSourceJa} · v4{report.v4HoldingsValueMYR}MYR
      </Text>
      <Text style={styles.line}>
        売却: {report.sellCandidates.join('・') || '—'} · 購入: {report.buyCandidates.join('・') || '—'}
      </Text>
      <Text style={styles.line}>
        リバランス後(リスク最小): YTL{riskPred.ytlDependencyPct}% · HHI{riskPred.hhi} · MC
        {riskPred.delistMcPct}%
      </Text>
      <Text style={styles.verdict}>{report.executionPriorityJa[0]}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  verdict: { color: theme.colors.textMuted, fontSize: 9, marginTop: 6, fontWeight: '600' },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
