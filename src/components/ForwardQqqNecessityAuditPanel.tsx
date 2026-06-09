import { StyleSheet, Text } from 'react-native';
import type { ForwardQqqNecessityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardQqqNecessityAuditReport | null;
  loading?: boolean;
};

export function ForwardQqqNecessityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その41 · QQQ必要性</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const current = report.scenarioRows.find((r) => r.scenarioId === 'current');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その41 · QQQ必要性</Text>
      <Text style={styles.subtitle}>
        {report.scenarioRows.length}通り · QQQ
        {report.keepQqqRecommendation ? '維持' : '要検討'} · {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerEJa}</Text>
      {current ? (
        <Text style={styles.line}>
          現行: 累積{current.cumulativeReturnPct}% · QQQ{current.qqqTradeCount}件 · DD
          {current.maxDrawdownPct ?? '—'}%
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
