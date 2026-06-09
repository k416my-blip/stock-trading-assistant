import { StyleSheet, Text } from 'react-native';
import type { ForwardSymbolWeightAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSymbolWeightAuditReport | null;
  loading?: boolean;
};

export function ForwardSymbolWeightAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その38 · 銘柄ウェイト</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = [...report.schemeRows].sort(
    (a, b) => b.cumulativeReturnPct - a.cumulativeReturnPct,
  )[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その38 · 銘柄ウェイト</Text>
      <Text style={styles.subtitle}>
        {report.schemeRows.length}通り · 運用{report.operationalSchemeId} · {report.operationalGrade}
      </Text>
      <Text style={styles.line}>{report.currentWeightNoteJa}</Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerDJa}</Text>
      {top ? (
        <Text style={styles.line}>
          累積1位 {top.schemeId}: {top.cumulativeReturnPct}% · RM+{top.expectedProfitMYR}
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
