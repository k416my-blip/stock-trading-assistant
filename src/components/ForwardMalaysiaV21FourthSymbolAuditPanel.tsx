import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV21FourthSymbolAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV21FourthSymbolAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV21FourthSymbolAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その69 · MY v2.1第4銘柄</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const best = report.candidates.find((c) => c.candidateId === report.bestAddCandidateId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その69 · MY v2.1 第4銘柄発掘</Text>
      <Text style={styles.subtitle}>
        推奨{report.recommendedFourSymbolId} · 50%未満
        {report.dependencyUnder50Pct ? '達成' : '未達'} · {report.adoptionGrade}評価
      </Text>
      {best ? (
        <Text style={styles.line}>
          {best.labelJa} · 最大依存{best.maxSingleDependencyPct}% · r=
          {best.avgCorrelationWithBase ?? '—'}
        </Text>
      ) : null}
      <Text style={styles.verdict}>{report.adoptionVerdictJa}</Text>
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
