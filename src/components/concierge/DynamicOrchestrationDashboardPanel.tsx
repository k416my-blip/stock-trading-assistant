import { StyleSheet, Text, View } from 'react-native';
import { ORCHESTRATION_UI_LABELS_JA } from '../../constants/dynamicLayerOrchestrationMobileRuntimeOptimization';
import type { DynamicLayerOrchestrationMobileRuntimeOptimizationBundle } from '../../types/dynamicLayerOrchestrationMobileRuntimeOptimization';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: DynamicLayerOrchestrationMobileRuntimeOptimizationBundle;
};

export function DynamicOrchestrationDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-dynamic-orchestration-dashboard-panel">
      <Text style={styles.title}>{ORCHESTRATION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{ORCHESTRATION_UI_LABELS_JA.health}</Text>
        <Text style={styles.scoreValue}>
          {bundle.orchestrationHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.userExplanationJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric
          label={ORCHESTRATION_UI_LABELS_JA.budget}
          value={`${bundle.computeBudgetUsed}/${bundle.computeBudgetMax} (残${bundle.computeBudgetRemaining})`}
        />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.latency} value={`${bundle.refreshLatencyMs}ms`} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.memory} value={`${bundle.memoryPressurePct}%`} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.queue} value={`${bundle.eventQueueSize}`} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.active} value={bundle.activeLayers.join(', ') || '—'} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.sleeping} value={bundle.sleepingLayers.slice(0, 4).join(', ') || '—'} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.deferred} value={bundle.deferredLayers.slice(0, 4).join(', ') || '—'} />
        <Metric label={ORCHESTRATION_UI_LABELS_JA.skipped} value={`${bundle.skippedLayerCount}`} />
        <Metric
          label={ORCHESTRATION_UI_LABELS_JA.emergency}
          value={bundle.emergencyOverrideActive ? 'ON' : 'off'}
        />
        <Metric
          label={ORCHESTRATION_UI_LABELS_JA.mobile}
          value={bundle.mobileOptimizationMode ? 'Redmi/mobile' : 'standard'}
        />
      </View>

      <SelectableText style={styles.footer}>
        hydration={bundle.progressiveHydration} · realTradingEnabled=
        {String(bundle.realTradingEnabled)}
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
  metricValue: { fontSize: 11, color: theme.colors.text },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
