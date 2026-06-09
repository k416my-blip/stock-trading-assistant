import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV3DcaAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV3DcaAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV3DcaAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その70 · MY v3積立</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const best = report.plans.find((p) => p.planId === report.bestDcaPlanId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その70 · Malaysia v3 積立</Text>
      <Text style={styles.subtitle}>
        推奨{report.bestDcaPlanId} · YTL{report.optimalYtlTimingId} · {report.adoptionGrade}評価
      </Text>
      {best ? (
        <Text style={styles.line}>
          {best.labelJa} · 最終RM{best.finalEquityMYR} · RM10k
          {best.monthsToRm10000 ?? '—'}ヶ月
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
