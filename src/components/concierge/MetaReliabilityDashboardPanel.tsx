import { StyleSheet, Text, View } from 'react-native';
import { META_RELIABILITY_UI_LABELS_JA } from '../../constants/metaReliabilityLongitudinalTrust';
import type { MetaReliabilityLongitudinalTrustBundle } from '../../types/metaReliabilityLongitudinalTrust';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: MetaReliabilityLongitudinalTrustBundle;
};

export function MetaReliabilityDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-meta-reliability-dashboard-panel">
      <Text style={styles.title}>{META_RELIABILITY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.uncertaintyDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{META_RELIABILITY_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.trustStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.trustSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={META_RELIABILITY_UI_LABELS_JA.reliability} value={`${bundle.metaReliabilityPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.trustDecay} value={`${bundle.trustDecayPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.semanticDrift} value={`${bundle.semanticDriftPct}%`} />
        <Metric
          label={META_RELIABILITY_UI_LABELS_JA.confidenceInflation}
          value={`${bundle.confidenceInflationPct}%`}
        />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.hallucination} value={`${bundle.hallucinationRiskPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.governance} value={`${bundle.governanceDeviationPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.consistency} value={`${bundle.longitudinalConsistencyPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.explanation} value={`${bundle.explanationIntegrityPct}%`} />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.stale} value={`${bundle.staleReasoningRiskPct}%`} />
        <Metric
          label={META_RELIABILITY_UI_LABELS_JA.orchestration}
          value={`budget ${bundle.orchestrationBudgetMax} · ${bundle.orchestrationInteractionJa}`}
        />
        <Metric label={META_RELIABILITY_UI_LABELS_JA.downgrade} value={bundle.downgradeReasonJa} />
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · watchHoldOnly=
        {String(bundle.watchHoldOnly)} · explanationOnly={String(bundle.explanationOnlyMode)} ·
        freezeAdaptive={String(bundle.freezeAdaptiveLearning)}
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
