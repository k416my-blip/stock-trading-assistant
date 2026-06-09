import { StyleSheet, Text } from 'react-native';
import type { ForwardMalaysiaV4TwelveBursaAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardMalaysiaV4TwelveBursaAuditReport | null;
  loading?: boolean;
};

export function ForwardMalaysiaV4TwelveBursaAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その83 · Twelve Bursa本番</Text>
        <Text style={styles.muted}>{loading ? '本番接続監査実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その83 · Twelve Data Bursa本番接続</Text>
      <Text style={styles.subtitle}>
        quote本番{report.productionQuoteSuccessRatePct}% · time_series本番
        {report.productionTimeSeriesSuccessRatePct}% · 最大価格差{report.maxPriceDiffPct ?? '—'}% ·{' '}
        {report.productionGrade}判定
      </Text>
      <Text style={styles.line}>
        API{report.twelveApiKeyAvailable ? ` ${report.totalApiRequests}req` : 'キー未設定'} · 制限
        {report.rateLimitHitCount}回
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
