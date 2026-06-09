import { StyleSheet, Text } from 'react-native';
import type { ForwardWinFactorAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardWinFactorAuditReport | null;
  loading?: boolean;
};

export function ForwardWinFactorAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その52 · 勝ち因子</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const full = report.cohortSummaries.find((c) => c.cohortId === 'full');
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その52 · 勝ち因子</Text>
      <Text style={styles.subtitle}>
        勝{full?.winCount ?? '—'}/負{full?.lossCount ?? '—'} · 勝率{full?.winRatePct ?? '—'}%
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      <Text style={styles.verdict}>{report.profitFactorRankingJa}</Text>
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
