import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4CandidateAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4CandidateAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4CandidateAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その76 · MY v4候補</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const best = report.compositeRanking[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その76 · Malaysia v4候補</Text>
      <Text style={styles.subtitle}>
        目標{report.cumulativeTargetPct}% · {report.adoptionGrade}評価
      </Text>
      {best ? (
        <Text style={styles.line}>
          1位{best.candidateLabelJa}·{best.ytlPolicyLabelJa} · {best.valueLabelJa}
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
