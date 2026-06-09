import { StyleSheet, Text } from 'react-native';
import type { ForwardSurvivorshipAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardSurvivorshipAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  not_biased: 'バイアス顕著でない',
  selection_bias_suspected: '選択バイアス疑い',
  baseline_conservative: '4ETF保守的',
  mixed: '混合',
};

export function ForwardSurvivorshipAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その12 · 生存者</Text>
        <Text style={styles.muted}>{loading ? '拡張ETF取得中…' : '未取得'}</Text>
      </Card>
    );
  }

  const { baseline4: b, extendedAll: e } = report;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その12 · 生存者</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.biasVerdict] ?? report.biasVerdict} · {e.universeSize}銘柄
      </Text>
      <Text style={styles.line}>
        4ETF: {b.tradeCount}件 WR{b.winRatePct}% 累積{b.cumulativeReturnPct}%
      </Text>
      <Text style={styles.line}>
        拡張: {e.tradeCount}件 WR{e.winRatePct}% 累積{e.cumulativeReturnPct}% 他{e.extendedOnlyTradeCount ?? 0}件
      </Text>
      <Text style={styles.verdict}>{report.biasVerdictJa}</Text>
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
