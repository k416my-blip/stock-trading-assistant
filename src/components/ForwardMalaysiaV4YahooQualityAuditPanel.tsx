import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4YahooQualityAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4YahooQualityAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4YahooQualityAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その81 · Yahoo品質</Text>
        <Text style={styles.muted}>{loading ? '品質監査実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その81 · Yahooデータ品質監査</Text>
      <Text style={styles.subtitle}>
        取得率{report.yahooSuccessRatePct}% · 欠損{report.aggregateMissingRatePct}% · 遅延
        {report.aggregateUpdateDelayDays}日 · {report.productionGrade}判定
      </Text>
      <Text style={styles.line}>
        異常値{report.aggregateAnomalyRatePct}% · Twelve
        {report.twelveDataAvailable ? ` ${report.twelveSuccessRatePct}%` : ' 未比較'}
      </Text>
      <Text style={styles.verdict}>{report.productionVerdictJa}</Text>
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
