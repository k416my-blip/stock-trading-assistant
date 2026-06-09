import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV2DiversificationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV2DiversificationAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV2DiversificationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その67 · MY v2分散</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const rec = report.patterns.find((p) => p.patternId === report.recommendedPatternId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その67 · MY v2 分散化</Text>
      <Text style={styles.subtitle}>
        推奨{report.recommendedPatternId} · 50%未満{report.dependencyUnder50Pct ? '達成' : '未達'} ·{' '}
        {report.adoptionGrade}評価
      </Text>
      {rec ? (
        <Text style={styles.line}>
          {rec.labelJa} · 最大依存{rec.maxSingleDependencyPct}% · 累積{rec.cumulativeReturnPct}%
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
