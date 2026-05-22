import { StyleSheet, Text, View } from 'react-native';
import { EPISTEMIC_UI_LABELS_JA } from '../../constants/epistemicIntegrityTruthCalibration';
import type { EpistemicIntegrityTruthCalibrationBundle } from '../../types/epistemicIntegrityTruthCalibration';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: EpistemicIntegrityTruthCalibrationBundle;
};

export function EpistemicIntegrityDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-epistemic-integrity-dashboard-panel">
      <Text style={styles.title}>{EPISTEMIC_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.uncertaintyDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{EPISTEMIC_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.epistemicStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.epistemicSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={EPISTEMIC_UI_LABELS_JA.health} value={`${bundle.epistemicHealthPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.calibration} value={`${bundle.confidenceCalibrationPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.hallucination} value={`${bundle.hallucinationRiskPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.unsupported} value={`${bundle.unsupportedClaimsPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.temporal} value={`${bundle.temporalDriftPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.contradiction} value={`${bundle.contradictionDensityPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.evidence} value={`${bundle.evidenceStabilityPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.speculative} value={`${bundle.speculativeExpansionPct}%`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.downgrade} value={bundle.explanationDowngradeActive ? 'ON' : 'off'} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.unknown} value={`${bundle.unknownStateRatioPct}%`} />
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · explanationOnly=
        {String(bundle.explanationOnlyMode)} · predictionThrottle=
        {String(bundle.predictionThrottleActive)} · clamp={bundle.confidenceClampPct}%
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
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, color: theme.colors.text },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
