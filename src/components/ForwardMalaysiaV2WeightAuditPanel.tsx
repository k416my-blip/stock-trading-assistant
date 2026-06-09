import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV2WeightAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV2WeightAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV2WeightAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その68 · MY v2.1ウェイト</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const adopted = report.patterns.find((p) => p.patternId === report.adoptedPatternId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その68 · MY v2.1 ウェイト最適化</Text>
      <Text style={styles.subtitle}>
        採用{report.adoptedPatternId} · 60%未満{report.dependencyUnder60Pct ? '達成' : '未達'} ·{' '}
        {report.adoptionGrade}評価
      </Text>
      {adopted ? (
        <Text style={styles.line}>
          {adopted.labelJa} · {adopted.weightLabelJa} · 最大依存{adopted.maxSingleDependencyPct}% ·
          累積{adopted.cumulativeReturnPct}%
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
