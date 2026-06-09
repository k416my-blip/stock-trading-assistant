import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3CrashAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3CrashAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3CrashAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その71 · MY v3暴落耐性</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const worst = report.scenarios.find((s) => s.scenarioId === report.worstScenarioId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その71 · MY v3 暴落耐性</Text>
      <Text style={styles.subtitle}>
        最悪{report.worstScenarioId} · {report.adoptionGrade}評価
      </Text>
      {worst ? (
        <Text style={styles.line}>
          {worst.labelJa} · 最低RM{worst.minEquityMYR} · MC破産{worst.bootstrap.bankruptcyRatePct}%
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
