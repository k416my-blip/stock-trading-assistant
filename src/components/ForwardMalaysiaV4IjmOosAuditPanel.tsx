import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4IjmOosAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4IjmOosAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4IjmOosAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その78 · IJM OOS最終</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その78 · IJM OOS最終検証</Text>
      <Text style={styles.subtitle}>
        OOS{report.oosTradeCount}/{report.allIjmTrades.length}件 · {report.adoptionGrade}評価
      </Text>
      <Text style={styles.line}>
        OOS勝率{report.oosWinRatePct}% · PF{report.oosProfitFactor ?? '—'} · 全期間+
        {report.fullTotalPnlMYR}MYR
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
