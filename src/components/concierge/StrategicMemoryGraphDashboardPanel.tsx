import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bundlePropsEqual } from './memoDashboardProps';
import { STRATEGIC_MEMORY_UI_LABELS_JA } from '../../constants/strategicMemoryGraphTemporalCausality';
import type { StrategicMemoryGraphTemporalCausalityBundle } from '../../types/strategicMemoryGraphTemporalCausality';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: StrategicMemoryGraphTemporalCausalityBundle;
};

function StrategicMemoryGraphDashboardPanelInner({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-strategic-memory-graph-dashboard-panel">
      <Text style={styles.title}>{STRATEGIC_MEMORY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.uncertaintyDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{STRATEGIC_MEMORY_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.graphStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.graphSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.health} value={`${bundle.graphHealthPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.causal} value={`${bundle.causalConfidencePct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.continuity} value={`${bundle.timelineContinuityPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.contradiction} value={`${bundle.contradictionDensityPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.recursive} value={`${bundle.recursiveLoopRiskPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.propagation} value={`${bundle.hallucinationPropagationPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.integrity} value={`${bundle.memoryIntegrityPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.unsupported} value={`${bundle.unsupportedCausalityPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.density} value={`${bundle.edgeDensityPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.drift} value={`${bundle.causalDriftPct}%`} />
        <Metric label={STRATEGIC_MEMORY_UI_LABELS_JA.fragmentation} value={`${bundle.temporalFragmentationPct}%`} />
      </View>

      {bundle.causalEdges.length > 0 ? (
        <View style={styles.edges}>
          <Text style={styles.edgesTitle}>Causal edges (hypothesis)</Text>
          {bundle.causalEdges.slice(0, 4).map((e) => (
            <SelectableText key={e.id} style={styles.edgeItem}>
              {e.from} → {e.to} ({e.kind}) {e.confidencePct}%
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · causalHypothesisOnly=
        {String(bundle.causalHypothesisOnly)} · edges={bundle.causalEdges.length}
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

export const StrategicMemoryGraphDashboardPanel = memo(
  StrategicMemoryGraphDashboardPanelInner,
  bundlePropsEqual,
);

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
  edges: { marginTop: theme.spacing.sm },
  edgesTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  edgeItem: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
