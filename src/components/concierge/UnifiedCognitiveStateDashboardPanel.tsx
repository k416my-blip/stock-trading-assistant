import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bundlePropsEqual } from './memoDashboardProps';
import { UNIFIED_COGNITIVE_UI_LABELS_JA } from '../../constants/unifiedCognitiveStateExecutiveAwareness';
import type { UnifiedCognitiveStateExecutiveAwarenessBundle } from '../../types/unifiedCognitiveStateExecutiveAwareness';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: UnifiedCognitiveStateExecutiveAwarenessBundle;
};

function UnifiedCognitiveStateDashboardPanelInner({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-unified-cognitive-state-dashboard-panel">
      <Text style={styles.title}>{UNIFIED_COGNITIVE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{UNIFIED_COGNITIVE_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.executiveStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.executiveSummaryJa}</SelectableText>

      <View style={styles.modeRow}>
        <SelectableText style={styles.mode}>
          {UNIFIED_COGNITIVE_UI_LABELS_JA.reasoning}: {bundle.reasoningModeJa}
        </SelectableText>
        <SelectableText style={styles.mode}>
          {UNIFIED_COGNITIVE_UI_LABELS_JA.orchestration}: {bundle.orchestrationModeJa}
        </SelectableText>
      </View>

      <View style={styles.metricsRow}>
        <Metric label={UNIFIED_COGNITIVE_UI_LABELS_JA.health} value={`${bundle.executiveHealthPct}%`} />
        <Metric label={UNIFIED_COGNITIVE_UI_LABELS_JA.coherence} value={`${bundle.globalCoherencePct}%`} />
        <Metric label={UNIFIED_COGNITIVE_UI_LABELS_JA.depth} value={`${bundle.safeReasoningDepthPct}%`} />
        <Metric label={UNIFIED_COGNITIVE_UI_LABELS_JA.recursive} value={`${bundle.recursiveDangerPct}%`} />
        <Metric
          label={UNIFIED_COGNITIVE_UI_LABELS_JA.saturation}
          value={`${bundle.orchestrationSaturationPct}%`}
        />
        <Metric
          label={UNIFIED_COGNITIVE_UI_LABELS_JA.hallucination}
          value={`${bundle.hallucinationRiskPct}%`}
        />
        <Metric label={UNIFIED_COGNITIVE_UI_LABELS_JA.trust} value={`${bundle.trustHealthPct}%`} />
        <Metric
          label={UNIFIED_COGNITIVE_UI_LABELS_JA.contradiction}
          value={`${bundle.contradictionPressurePct}%`}
        />
        <Metric
          label={UNIFIED_COGNITIVE_UI_LABELS_JA.fragmentation}
          value={`${bundle.fragmentationScorePct}%`}
        />
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

export const UnifiedCognitiveStateDashboardPanel = memo(
  UnifiedCognitiveStateDashboardPanelInner,
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
  safety: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  modeRow: { marginBottom: theme.spacing.sm, gap: 4 },
  mode: { fontSize: 12, color: theme.colors.textMuted },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, color: theme.colors.text },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
