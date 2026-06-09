import { StyleSheet, Text } from 'react-native';
import type { ForwardAdx20ValidationAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardAdx20ValidationAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  genuine_adx20_superiority: 'ADX20真の優位',
  extra_trades_driven: '追加件依存',
  marginal_extra_driven: '部分追加依存',
  mixed: '混合',
};

export function ForwardAdx20ValidationAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その18 · ADX20妥当性</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その18 · ADX20妥当性</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 追加
        {report.extraTrades.length}件
      </Text>
      <Text style={styles.line}>
        20: {report.adx20.tradeCount}件 累積{report.adx20.cumulativeReturnPct}% / 25:{' '}
        {report.adx25.tradeCount}件 累積{report.adx25.cumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        追加WR{report.extraTradesWinRatePct}% 累積{report.extraTradesCumulativeReturnPct}% · 除外後
        {report.adx20WithoutExtras.cumulativeReturnPct}%
      </Text>
      <Text style={styles.verdict}>{report.verdictJa}</Text>
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
