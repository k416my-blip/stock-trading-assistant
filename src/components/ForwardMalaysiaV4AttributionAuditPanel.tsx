import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4AttributionAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4AttributionAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4AttributionAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その77 · YTL依存率変化</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その77 · YTL依存率変化</Text>
      <Text style={styles.subtitle}>
        {report.audit73YtlDependencyPct}%→{report.audit76YtlDependencyPct}% ·{' '}
        {report.adoptionGrade}評価
      </Text>
      <Text style={styles.line}>
        v3累積{report.v3CumulativePct}% · v4累積{report.v4CumulativePct}% · IJM+
        {report.ijmAddedProfitMYR}MYR
      </Text>
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
