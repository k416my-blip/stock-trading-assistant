import { StyleSheet, Text, View } from 'react-native';
import type { BayesianAllocationReport } from '../types/bayesianAllocation';
import { Card } from './ui/Card';
import { theme } from '../theme';

const DATA_SOURCE_LABEL = {
  live_api: 'Twelve Data',
  cache: 'キャッシュ',
  synthetic_fallback: '合成履歴',
};

const METHOD_LABEL: Record<string, string> = {
  black_litterman: 'Black-Litterman',
  fractional_kelly: 'フラクショナルKelly',
  ewma_risk_parity: 'EWMAリスクパリティ',
  rolling_shrink_mvo: 'ローリング収縮MVO',
  stability_penalized: '安定性ペナルティ',
};

type Props = {
  report: BayesianAllocationReport;
};

export function BayesianAllocationPanel({ report }: Props) {
  return (
    <Card style={styles.card}>
      <Text style={styles.title}>ベイズ動的配分</Text>
      <Text style={styles.subtitle}>
        {DATA_SOURCE_LABEL[report.dataSource]} · {report.tradingDays}日
      </Text>

      <View
        style={[
          styles.verdict,
          report.robustnessRanking[0]?.compositeScore >= 60
            ? styles.verdictOk
            : styles.verdictWarn,
        ]}
      >
        <Text style={styles.verdictText}>{report.verdictJa}</Text>
      </View>

      <Text style={styles.section}>推奨配分（{METHOD_LABEL[report.recommendedMethodId]}）</Text>
      {report.recommendedWeights.map((w) => (
        <Text key={w.symbol} style={styles.muted}>
          {w.symbol}: {w.weightPct}%
        </Text>
      ))}

      <Text style={styles.section}>共分散推定</Text>
      <Text style={styles.line}>{report.ewmaCovariance.noteJa}</Text>
      <Text style={styles.line}>{report.rollingShrinkage.noteJa}</Text>

      <Text style={styles.section}>Black-Litterman</Text>
      <Text style={styles.line}>{report.blackLitterman.noteJa}</Text>
      <Text style={styles.muted}>
        τ={report.blackLitterman.tau} · ビュー信頼度 {report.blackLitterman.viewConfidence}%
      </Text>

      <Text style={styles.section}>フラクショナル Kelly</Text>
      <Text style={styles.line}>{report.fractionalKelly.noteJa}</Text>

      <Text style={styles.section}>レジーム持続性</Text>
      <Text style={styles.line}>{report.regimePersistence.noteJa}</Text>
      <Text style={styles.muted}>
        持続スコア {report.regimePersistence.persistenceScore}/100 · 遷移リスク{' '}
        {report.regimePersistence.transitionRiskPct}%
      </Text>

      <Text style={styles.section}>動的不確実性スケール</Text>
      <Text style={styles.line}>{report.dynamicUncertainty.noteJa}</Text>
      <Text style={styles.muted}>
        τ {report.dynamicUncertainty.baseTau}→{report.dynamicUncertainty.scaledTau} · Ωスケール{' '}
        {report.dynamicUncertainty.viewOmegaScale}
      </Text>

      <Text style={styles.section}>ウェイト安定性</Text>
      <Text style={styles.line}>{report.weightStability.noteJa}</Text>

      <Text style={styles.section}>最適化感度</Text>
      <Text style={styles.line}>{report.sensitivity.noteJa}</Text>
      {report.sensitivity.perturbations.map((p) => (
        <Text key={p.parameter} style={styles.muted}>
          {p.parameter}: 最大ウェイト変化 {p.maxWeightChangePct}%
        </Text>
      ))}

      <Text style={styles.section}>ベイズ信頼区間（95%）</Text>
      {report.confidenceIntervals.slice(0, 8).map((c) => (
        <Text key={c.symbol} style={styles.muted}>
          {c.symbol}: ウェイト [{c.weightLowerPct}%, {c.weightUpperPct}%] · リターン [
          {c.returnLowerPct}%, {c.returnUpperPct}%]
        </Text>
      ))}

      <Text style={styles.section}>頑健性ランキング</Text>
      {report.robustnessRanking.map((r) => (
        <View key={r.methodId} style={styles.row}>
          <Text style={styles.rowTitle}>
            #{r.rank} {r.methodLabelJa}
            {r.methodId === report.recommendedMethodId ? ' ★' : ''}
          </Text>
          <Text style={styles.muted}>
            総合 {r.compositeScore} · 安定 {r.stabilityScore} · 感度 {r.sensitivityScore} · CI{' '}
            {r.ciWidthScore}
          </Text>
        </View>
      ))}
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
