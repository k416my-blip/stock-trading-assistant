import { StyleSheet, Text, View } from 'react-native';
import { HUMAN_INTENT_UI_LABELS_JA } from '../../constants/humanIntentContinuityAlignmentPreservation';
import type { HumanIntentContinuityAlignmentPreservationBundle } from '../../types/humanIntentContinuityAlignmentPreservation';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: HumanIntentContinuityAlignmentPreservationBundle;
};

export function HumanIntentContinuityDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-human-intent-continuity-dashboard-panel">
      <Text style={styles.title}>{HUMAN_INTENT_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{HUMAN_INTENT_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.alignmentStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.alignmentSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.health} value={`${bundle.intentHealthPct}%`} />
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.integrity} value={`${bundle.alignmentIntegrityPct}%`} />
        <Metric
          label={HUMAN_INTENT_UI_LABELS_JA.reinterpretation}
          value={`${bundle.reinterpretationPressurePct}%`}
        />
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.semantic} value={`${bundle.semanticContinuityPct}%`} />
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.strategy} value={`${bundle.strategyAlignmentPct}%`} />
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.context} value={`${bundle.contextIntegrityPct}%`} />
        <Metric
          label={HUMAN_INTENT_UI_LABELS_JA.instruction}
          value={`${bundle.instructionContinuityPct}%`}
        />
        <Metric
          label={HUMAN_INTENT_UI_LABELS_JA.deviation}
          value={`${bundle.orchestrationDeviationPct}%`}
        />
        <Metric
          label={HUMAN_INTENT_UI_LABELS_JA.unsupported}
          value={`${bundle.unsupportedInferenceRiskPct}%`}
        />
        <Metric label={HUMAN_INTENT_UI_LABELS_JA.safe} value={`${bundle.safeAlignmentPct}%`} />
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · strategyChangeForbidden=
        {String(bundle.strategyActionChangeForbidden)} · budget={bundle.orchestrationBudgetMax}
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
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
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
