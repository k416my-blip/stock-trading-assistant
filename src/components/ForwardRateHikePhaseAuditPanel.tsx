import { StyleSheet, Text } from 'react-native';
import type { ForwardRateHikePhaseAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardRateHikePhaseAuditReport | null;
  loading?: boolean;
};

export function ForwardRateHikePhaseAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その47 · 利上げ</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const hikeB = report.phaseRows.find((r) => r.phaseId === 'hike_0_3m');

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その47 · 利上げ</Text>
      <Text style={styles.subtitle}>
        利上げ開始3か月 {hikeB?.tradeCount ?? 0}件 · 累積{hikeB?.cumulativeReturnPct ?? '—'}%
      </Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.verdict}>{report.phaseConclusionJa}</Text>
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
