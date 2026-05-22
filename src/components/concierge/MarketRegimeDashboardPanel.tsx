import { StyleSheet, Text, View } from 'react-native';
import { REGIME_UI_LABELS_JA } from '../../constants/autonomousMarketRegimeDetection';
import type { AutonomousMarketRegimeDetectionBundle } from '../../types/autonomousMarketRegimeDetection';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: AutonomousMarketRegimeDetectionBundle;
};

export function MarketRegimeDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-market-regime-dashboard-panel">
      <Text style={styles.title}>{REGIME_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.classificationDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{REGIME_UI_LABELS_JA.regime}</Text>
        <Text style={styles.scoreValue}>{bundle.regimeLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.regimeSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={REGIME_UI_LABELS_JA.confidence} value={`${bundle.regimeConfidencePct}%`} />
        <Metric label={REGIME_UI_LABELS_JA.uncertainty} value={`${bundle.uncertaintyPct}%`} />
        <Metric label={REGIME_UI_LABELS_JA.panicRisk} value={`${bundle.panicRiskPct}%`} />
        <Metric label={REGIME_UI_LABELS_JA.adaptation} value={bundle.adaptationMode} />
        <Metric
          label={REGIME_UI_LABELS_JA.budget}
          value={`max ${bundle.orchestrationBudgetMax}`}
        />
        <Metric label={REGIME_UI_LABELS_JA.clamp} value={`≤${bundle.confidenceClampPct}%`} />
        <Metric label="Active layers" value={bundle.activeLayersSummaryJa} />
        <Metric label="Suspended" value={bundle.suspendedLayersSummaryJa} />
        <Metric label={REGIME_UI_LABELS_JA.mobile} value={bundle.mobileRuntimeStateJa} />
        <Metric label={REGIME_UI_LABELS_JA.governance} value={bundle.governanceOverrideJa} />
        <Metric label={REGIME_UI_LABELS_JA.recovery} value={bundle.recoveryInteractionJa} />
        <Metric
          label={REGIME_UI_LABELS_JA.volatility}
          value={`risk ${bundle.volatilityRiskPct}% · trend ${bundle.volatilityTrendPct}%`}
        />
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · explanationOnly=
        {String(bundle.explanationOnlyMode)} · freezeAdaptive=
        {String(bundle.freezeAdaptiveLayers)}
      </SelectableText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <SelectableText style={styles.metricValue}>{value}</SelectableText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.md,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: theme.spacing.sm },
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  disclaimer: { fontSize: 11, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metric: { width: '48%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 12, color: theme.colors.text },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
