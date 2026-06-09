import { StyleSheet, Text } from 'react-native';
import type { ForwardDgroLowAdxAuditReport } from '../types/forwardValidation';
import { Card } from './ui/Card';
import { theme } from '../theme';

type Props = {
  report: ForwardDgroLowAdxAuditReport | null;
  loading?: boolean;
};

const VERDICT_LABEL: Record<string, string> = {
  dgro_specific: 'DGRO固有',
  strategy_wide: '戦略全体',
  mixed: '混合',
  insufficient: '不足',
};

function fmtSymbolLine(
  s: ForwardDgroLowAdxAuditReport['symbolStats'][number],
): string {
  return `${s.symbol} ${s.tradeCount}件 WR${s.winRatePct}% 累積${s.cumulativeReturnPct}% 均R${s.avgReturnPct ?? '—'}% 最大損${s.maxLossPct ?? '—'}%`;
}

export function ForwardDgroLowAdxAuditPanel({ report, loading }: Props) {
  if (loading || !report) {
    return (
      <Card style={styles.card}>
        <Text style={styles.title}>最重要監査その19 · DGRO低ADX</Text>
        <Text style={styles.muted}>{loading ? '検証実行中…' : '未取得'}</Text>
      </Card>
    );
  }

  const dgro = report.symbolStats.find((s) => s.symbol === 'DGRO');
  const band1520 = report.band1520;
  const band2025 = report.band2025;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>最重要監査その19 · DGRO低ADX</Text>
      <Text style={styles.subtitle}>
        {VERDICT_LABEL[report.verdict] ?? report.verdict} · 対象{report.targetTradeCount}件
      </Text>
      {dgro ? <Text style={styles.line}>{fmtSymbolLine(dgro)}</Text> : null}
      <Text style={styles.line}>
        15-20帯 {band1520.tradeCount}件 累積{band1520.cumulativeReturnPct}% / 20-25帯{' '}
        {band2025.tradeCount}件 累積{band2025.cumulativeReturnPct}%
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
