import { StyleSheet, Text, View } from 'react-native';
import type { ForwardVix25SpyGapAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix25SpyGapAuditReport | null;
  loading?: boolean;
};

export function ForwardVix25SpyGapAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX25×SPY ギャップ</Text>
        <Text style={styles.muted}>{loading ? '集計中…' : '未取得'}</Text>
      </Card>
    );
  }
  const s = report.summary;
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>翌日ギャップ（VIX25×SPY）</Text>
      <Text style={styles.subtitle}>
        均{s.avgGapPct ?? '—'}% · 中央{s.medianGapPct ?? '—'}% · {report.cohortCount}件
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
