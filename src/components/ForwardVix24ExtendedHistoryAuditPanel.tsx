import { StyleSheet, Text } from 'react-native';
import type { ForwardVix24ExtendedHistoryAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardVix24ExtendedHistoryAuditReport | null;
  loading?: boolean;
};

export function ForwardVix24ExtendedHistoryAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>VIX≥24 拡張履歴</Text>
        <Text style={styles.muted}>{loading ? '2018〜データ取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const y2025 = report.yearly.find((y) => y.year === '2025');
  const outside = report.outsideAprMay2025;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>VIX≥24 拡張履歴 (2018〜)</Text>
      <Text style={styles.subtitle}>
        全{report.totalSignalCount}件 · 4〜5月外 {outside.tradeCount}件
      </Text>
      <Text style={styles.line}>
        2025: {y2025?.tradeCount ?? 0}件 · 4〜5月外 勝率{outside.winRatePct}% 累積
        {outside.cumulativeReturnPct}%
      </Text>
      {report.yearly
        .filter((y) => y.tradeCount > 0 || y.vixGte24Days > 0)
        .map((y) => (
          <Text key={y.year} style={styles.line}>
            {y.year}: sig{y.vixGte24SignalCount} VIX{y.vixGte24Days}日 R{y.cumulativeReturnPct}%
          </Text>
        ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '700', fontSize: theme.fontSize.md },
  subtitle: { color: theme.colors.textMuted, fontSize: theme.fontSize.xs, marginTop: 4 },
  line: { color: theme.colors.text, fontSize: 9, marginTop: 2 },
  muted: { color: theme.colors.textMuted, fontSize: 10 },
});
