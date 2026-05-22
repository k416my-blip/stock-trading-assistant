import { StyleSheet, Text, View } from 'react-native';
import { SYSTEMIC_UI_LABELS_JA } from '../../constants/systemicStabilityRecursiveGovernance';
import type { SystemicStabilityRecursiveGovernanceBundle } from '../../types/systemicStabilityRecursiveGovernance';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: SystemicStabilityRecursiveGovernanceBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function SystemicStabilityDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.stabilityHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-systemic-stability-dashboard-panel">
      <Text style={styles.title}>{SYSTEMIC_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{SYSTEMIC_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.stabilityHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.stabilitySummaryJa}</SelectableText>

      {bundle.systemicEmergencySafeMode ? (
        <SelectableText style={styles.warn}>
          {SYSTEMIC_UI_LABELS_JA.safeMode}: watch / hold only · confidence ≤30
        </SelectableText>
      ) : null}
      {bundle.arbitrationHalted ? (
        <SelectableText style={styles.warn}>Arbitration halted (recursive loop)</SelectableText>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric label={SYSTEMIC_UI_LABELS_JA.recursiveLoop} value={`${bundle.recursiveLoopRiskPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.governanceSat} value={`${bundle.governanceSaturationPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.cascade} value={`${bundle.cascadeRiskPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.oscillation} value={`${bundle.oscillationRiskPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.freezeChain} value={`${bundle.freezeChainCount}`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.arbitrationRec} value={`${bundle.arbitrationRecursionPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.downgradeCascade} value={`${bundle.downgradeCascadePct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.consensus} value={`${bundle.stabilityConsensusPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.equilibrium} value={`${bundle.cognitiveEquilibriumPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.governanceLoad} value={`${bundle.governanceLoadPct}%`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.drift} value={`${bundle.stabilityDriftPct}`} />
        <Metric label={SYSTEMIC_UI_LABELS_JA.recovery} value={`${bundle.recoveryHealthPct}%`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Stability timeline</Text>
        {bundle.stabilityTimeline.slice(-3).map((p) => (
          <SelectableText key={p.at} style={styles.bullet}>
            · {p.at.slice(11, 19)} health {p.stabilityHealth} recursive {p.recursiveRisk} cascade{' '}
            {p.cascadeRisk}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} — {bundle.explainRuleBasisJa}
      </SelectableText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '30%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
