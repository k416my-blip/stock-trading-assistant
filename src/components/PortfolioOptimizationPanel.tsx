import { StyleSheet, Text, View } from 'react-native';
import type { PortfolioOptimizationReport } from '../types/portfolioOptimization';
import { Card } from './ui/Card';
import { theme } from '../theme';

const DATA_SOURCE_LABEL = {
  live_api: 'Twelve Data',
  cache: 'キャッシュ',
  synthetic_fallback: '合成履歴',
};

const METHOD_LABEL: Record<string, string> = {
  risk_parity: 'リスクパリティ',
  min_variance: '最小分散',
  cvar: 'CVaR',
  kelly_capped: 'Kelly制約',
  regime_blend: 'レジーム・ブレンド',
};

type Props = {
  report: PortfolioOptimizationReport;
};

export function PortfolioOptimizationPanel({ report }: Props) {
  const rec = report.allocations.find((a) => a.methodId === report.recommendedMethodId);

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>機関ポートフォリオ最適化</Text>
      <Text style={styles.subtitle}>
        {DATA_SOURCE_LABEL[report.dataSource]} · {report.tradingDays}日 · 収縮λ=
        {report.covariance.shrinkageIntensity}
      </Text>

      <View
        style={[
          styles.verdict,
          report.monteCarloRobustness.robustnessScore >= 55
            ? styles.verdictOk
            : styles.verdictWarn,
        ]}
      >
        <Text style={styles.verdictText}>{report.verdictJa}</Text>
      </View>

      <Text style={styles.section}>共分散推定</Text>
      <Text style={styles.line}>{report.covariance.noteJa}</Text>
      <Text style={styles.muted}>
        条件数 {report.covariance.conditionNumber} · 平均相関{' '}
        {report.covariance.avgPairwiseCorr}
      </Text>

      <Text style={styles.section}>推奨配分（{METHOD_LABEL[report.recommendedMethodId]}）</Text>
      {report.recommendedWeights.map((w) => (
        <Text key={w.symbol} style={styles.muted}>
          {w.symbol}: {w.weightPct}%
        </Text>
      ))}
      {rec ? (
        <Text style={styles.muted}>
          年率ボラ {rec.expectedVolPct}% · 期待リターン {rec.expectedReturnPct}% · CVaR{' '}
          {rec.cvar95Pct}% · Sharpe {rec.sharpe}
        </Text>
      ) : null}

      <Text style={styles.section}>最適化手法比較</Text>
      {report.allocations.map((a) => (
        <View key={a.methodId} style={styles.row}>
          <Text style={styles.rowTitle}>
            {a.methodLabelJa}
            {a.methodId === report.recommendedMethodId ? ' ★' : ''}
          </Text>
          <Text style={styles.muted}>
            ボラ {a.expectedVolPct}% · CVaR {a.cvar95Pct}% · Sharpe {a.sharpe}
            {a.cashWeightPct > 0 ? ` · 現金 ${a.cashWeightPct}%` : ''}
          </Text>
        </View>
      ))}

      <Text style={styles.section}>Kelly制約</Text>
      <Text style={styles.line}>{report.kelly.noteJa}</Text>

      <Text style={styles.section}>レジーム配分</Text>
      <Text style={styles.line}>{report.regimeNoteJa}</Text>

      <Text style={styles.section}>エクスポージャー中立化</Text>
      <Text style={styles.line}>{report.exposureNeutral.noteJa}</Text>

      <Text style={styles.section}>ターンオーバー制約リバランス</Text>
      <Text style={styles.line}>{report.turnoverRebalance.noteJa}</Text>
      {report.turnoverRebalance.actions
        .filter((a) => a.action !== 'hold')
        .slice(0, 8)
        .map((a) => (
          <Text key={a.symbol} style={styles.muted}>
            {a.symbol}: {a.currentPct}%→{a.feasiblePct}% ({a.action === 'buy' ? '買' : '売'}{' '}
            {Math.abs(a.deltaPct)}%)
          </Text>
        ))}

      <Text style={styles.section}>モンテカルロ頑健性</Text>
      <Text style={styles.line}>{report.monteCarloRobustness.noteJa}</Text>
      <Text style={styles.muted}>
        スコア {report.monteCarloRobustness.robustnessScore}/100 · 中央値{' '}
        {report.monteCarloRobustness.medianReturnPct}% · P5{' '}
        {report.monteCarloRobustness.p5ReturnPct}% · 損失確率{' '}
        {report.monteCarloRobustness.probLossPct}%
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { fontSize: theme.fontSize.lg, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginTop: 4 },
  verdict: { marginTop: theme.spacing.sm, padding: theme.spacing.sm, borderRadius: 8 },
  verdictOk: { backgroundColor: 'rgba(34, 197, 94, 0.15)' },
  verdictWarn: { backgroundColor: 'rgba(234, 179, 8, 0.15)' },
  verdictText: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm },
  section: {
    marginTop: theme.spacing.md,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  row: { marginTop: 6 },
  rowTitle: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '500' },
});
