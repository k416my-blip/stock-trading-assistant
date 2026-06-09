import { StyleSheet, Text } from 'react-native';
import type { ForwardVix2430BandValidityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix2430BandValidityAuditReport | null;
  loading?: boolean;
};

export function ForwardVix2430BandValidityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その46 · VIX帯</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const band2430 = report.bandRows.filter((b) =>
    ['vix_d_24_26', 'vix_e_26_28', 'vix_f_28_30'].includes(b.bandId),
  );
  const trades2430 = band2430.reduce((s, b) => s + b.tradeCount, 0);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その46 · VIX帯</Text>
      <Text style={styles.subtitle}>VIX24〜30細分 {trades2430}件</Text>
      <Text style={styles.line}>{report.answerAJa}</Text>
      <Text style={styles.line}>{report.answerBJa}</Text>
      <Text style={styles.verdict}>{report.dangerConclusionJa}</Text>
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
