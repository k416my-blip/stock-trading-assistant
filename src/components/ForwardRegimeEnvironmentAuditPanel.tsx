import { StyleSheet, Text } from 'react-native';
import type { ForwardRegimeEnvironmentAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRegimeEnvironmentAuditReport | null;
  loading?: boolean;
};

export function ForwardRegimeEnvironmentAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その39 · Regime環境</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = [...report.environmentRows]
    .filter((r) => r.tradeCount >= 3)
    .sort((a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct)[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その39 · Regime環境</Text>
      <Text style={styles.subtitle}>
        {report.executedTradeCount}件 · {report.operationalGrade} · VIX
        {report.vixDataAvailable ? 'OK' : '—'}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      {top ? (
        <Text style={styles.line}>
          累積1位 {top.labelJa}: {top.cumulativeReturnPct}% · {top.tradeCount}件
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
