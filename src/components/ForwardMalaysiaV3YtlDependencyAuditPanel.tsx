import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3YtlDependencyAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3YtlDependencyAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3YtlDependencyAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その74 · MY v3 YTL依存</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const worst = report.scenarios.find((s) => s.scenarioId === report.worstScenarioId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その74 · MY v3 YTL POWER依存</Text>
      <Text style={styles.subtitle}>
        YTL寄与{report.ytlNetContributionPct}% · {report.adoptionGrade}評価
      </Text>
      {worst ? (
        <Text style={styles.line}>
          最悪{worst.labelJa} · 累積{worst.cumulativeReturnPct}% · MC破産
          {worst.bootstrap.bankruptcyRatePct}%
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
