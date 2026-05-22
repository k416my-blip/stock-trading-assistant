import { StyleSheet, Text, View } from 'react-native';
import { CONSENSUS_UI_LABELS_JA } from '../../constants/cognitiveArbitrationConsensus';
import type { CognitiveArbitrationConsensusBundle } from '../../types/cognitiveArbitrationConsensus';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: CognitiveArbitrationConsensusBundle;
};

export function CognitiveConsensusDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-cognitive-consensus-dashboard-panel">
      <Text style={styles.title}>{CONSENSUS_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.uncertaintyDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{CONSENSUS_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.consensusStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.consensusSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={CONSENSUS_UI_LABELS_JA.contradiction} value={`${bundle.contradictionRiskPct}%`} />
        <Metric label={CONSENSUS_UI_LABELS_JA.alignment} value={`${bundle.semanticAlignmentPct}%`} />
        <Metric label="Final consensus" value={`${bundle.finalConsensusPct}%`} />
        <Metric label={CONSENSUS_UI_LABELS_JA.health} value={`${bundle.consensusHealthPct}%`} />
        <Metric label={CONSENSUS_UI_LABELS_JA.uncertainty} value={`${bundle.uncertaintyPct}%`} />
        <Metric
          label={CONSENSUS_UI_LABELS_JA.governance}
          value={bundle.governanceOverrideActive ? 'ON' : 'off'}
        />
        <Metric label={CONSENSUS_UI_LABELS_JA.participants} value={bundle.activeParticipantsJa} />
        <Metric label={CONSENSUS_UI_LABELS_JA.suppressed} value={bundle.suppressedLayersJa} />
        <Metric
          label={CONSENSUS_UI_LABELS_JA.orchestration}
          value={`budget ${bundle.orchestrationBudgetMax} · ${bundle.orchestrationImpactJa}`}
        />
        <Metric label={CONSENSUS_UI_LABELS_JA.latency} value={`${bundle.arbitrationLatencyMs}ms`} />
        <Metric label={CONSENSUS_UI_LABELS_JA.downgrade} value={bundle.downgradeReasonJa} />
        <Metric label={CONSENSUS_UI_LABELS_JA.panic} value={bundle.panicInteractionJa} />
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · watchHoldOnly=
        {String(bundle.watchHoldOnly)} · explanationOnly={String(bundle.explanationOnlyMode)}
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
