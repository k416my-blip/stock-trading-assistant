import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4FinalCompareAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4FinalCompareAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4FinalCompareAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その79 · v4最終比較</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const top = report.compositeRanking[0];

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その79 · v4最終候補同条件比較</Text>
      <Text style={styles.subtitle}>
        {report.compositeWeightsJa} · {report.adoptionGrade}評価
      </Text>
      {top ? (
        <Text style={styles.line}>
          1位 {top.candidateLabelJa} · 累積
          {report.rows.find((r) => r.candidateId === top.candidateId)?.cumulativeReturnPct}% · 廃止MC
          {report.rows.find((r) => r.candidateId === top.candidateId)?.delistBankruptcyRatePct}%
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
