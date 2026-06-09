import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV2AuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV2AuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV2AuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その65 · MY v2</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const exBoth = report.scenarios.find((s) => s.scenarioId === 'ex_both');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その65 · MY v2 YTL依存</Text>
      <Text style={styles.subtitle}>
        YTL依存{report.ytlDependencyPct ?? '—'}% · 推奨{report.recommendedScenarioId} ·{' '}
        {report.adoptionGrade}評価
      </Text>
      {exBoth ? (
        <Text style={styles.line}>
          YTL+99除外: 累積{exBoth.cumulativeReturnPct}% · MaxDD{exBoth.maxDrawdownPct}% · OOS
          {exBoth.wfOos.testCumulativePct}%
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
