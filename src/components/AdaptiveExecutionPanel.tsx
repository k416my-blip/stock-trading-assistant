import { StyleSheet, Text, View } from 'react-native';
import type { AdaptiveExecutionReport } from '../types/adaptiveExecution';
import { MARKET_REGIME_LABEL } from '../constants/marketRegime';
import { Card } from './ui/Card';
import { theme } from '../theme';

const HEALTH_STYLE = {
  green: { bg: 'rgba(34, 197, 94, 0.2)', label: '緑 — 執行可' },
  yellow: { bg: 'rgba(234, 179, 8, 0.2)', label: '黄 — 慎重' },
  red: { bg: 'rgba(239, 68, 68, 0.2)', label: '赤 — 制限' },
};

type Props = { report: AdaptiveExecutionReport };

export function AdaptiveExecutionPanel({ report }: Props) {
  const h = HEALTH_STYLE[report.healthStatus];
  const ps = report.positionSizing;
  const vt = report.volTargeting;
  const rp = report.regimePrediction;

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>適応執行・アルファ</Text>

      <View style={[styles.health, { backgroundColor: h.bg }]}>
        <Text style={styles.verdict}>{report.verdictJa}</Text>
        <Text style={styles.healthBadge}>{h.label}</Text>
      </View>

      <Text style={styles.section}>ポジションサイズ・インテリジェンス</Text>
      <Text style={styles.muted}>{ps.noteJa}</Text>
      <Text style={styles.line}>
        配分 {ps.suggestedAllocationPct}% · {ps.suggestedShares}株 · Kelly上限 {ps.kellyFractionCapped}%
      </Text>

      <Text style={styles.section}>動的リスク予算</Text>
      <Text style={styles.muted}>{report.riskBudget.noteJa}</Text>
      <Text style={styles.line}>
        利用 {report.riskBudget.utilizationPct}% · 残 {report.riskBudget.availableRiskMYR} MYR
      </Text>

      <Text style={styles.section}>ボラ・ターゲティング</Text>
      <Text style={styles.muted}>{vt.noteJa}</Text>
      <Text style={styles.line}>
        目標 {vt.targetVolPct}% · 実現 {vt.realizedVolPct}% · 上限 {vt.grossExposureCapPct}%
      </Text>

      <Text style={styles.section}>クロスアセット・マクロ</Text>
      <Text style={styles.muted}>{report.macroOverlay.noteJa}</Text>
      <Text style={styles.line}>
        β目標 {report.macroOverlay.betaTarget} · {report.macroOverlay.liquidityRegimeJa}
      </Text>

      <Text style={styles.section}>レジーム予測</Text>
      <Text style={styles.muted}>{rp.noteJa}</Text>
      <Text style={styles.line}>
        現在 {MARKET_REGIME_LABEL[rp.currentRegimeId]} → 予測{' '}
        {MARKET_REGIME_LABEL[rp.predictedNextRegimeId]}
      </Text>

      <Text style={styles.section}>シグナル品質 · アルファ減衰</Text>
      <Text style={styles.line}>
        品質 {report.signalQuality.score} · 減衰 {report.alphaDecay.decayPct}% · エッジ{' '}
        {report.alphaDecay.currentEdgeBps}bps
      </Text>
      <Text style={styles.muted}>{report.alphaDecay.noteJa}</Text>

      <Text style={styles.section}>執行タイミング · スライス</Text>
      <Text style={styles.muted}>{report.timing.rationaleJa}</Text>
      <Text style={styles.line}>
        {report.defaultSlicePlan.noteJa} · {report.latencyPlan.noteJa}
      </Text>

      <Text style={styles.section}>オンライン学習 · 強化学習</Text>
      <Text style={styles.muted}>{report.onlineLearning.adaptationNoteJa}</Text>
      <Text style={styles.line}>
        スリッページ EWMA {report.onlineLearning.updatedSlippageBps}bps · 約定率{' '}
        {(report.onlineLearning.updatedFillRate * 100).toFixed(0)}%
      </Text>
      <Text style={styles.muted}>{report.reinforcement.noteJa}</Text>

      {report.orderPlans.length > 0 ? (
        <>
          <Text style={styles.section}>注文プラン</Text>
          {report.orderPlans.map((p) => (
            <View key={p.symbol} style={styles.plan}>
              <Text style={styles.line}>
                {p.symbol} · {p.totalShares}株 · {p.timing.grade}
              </Text>
              <Text style={styles.muted}>{p.slices.noteJa}</Text>
            </View>
          ))}
        </>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: theme.spacing.sm },
  title: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.md },
  health: { padding: theme.spacing.sm, borderRadius: theme.radius.sm, marginTop: theme.spacing.sm },
  verdict: { color: theme.colors.text, fontSize: theme.fontSize.sm },
  healthBadge: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 4 },
  section: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginTop: theme.spacing.md,
  },
  line: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginTop: 4 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  plan: { marginTop: theme.spacing.xs },
});
