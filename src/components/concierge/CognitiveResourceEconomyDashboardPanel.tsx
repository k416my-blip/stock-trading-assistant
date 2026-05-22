import { StyleSheet, Text, View } from 'react-native';
import { RESOURCE_ECONOMY_UI_LABELS_JA } from '../../constants/cognitiveResourceEconomyAttentionAllocation';
import type { CognitiveResourceEconomyAttentionAllocationBundle } from '../../types/cognitiveResourceEconomyAttentionAllocation';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: CognitiveResourceEconomyAttentionAllocationBundle;
};

export function CognitiveResourceEconomyDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-cognitive-resource-economy-dashboard-panel">
      <Text style={styles.title}>{RESOURCE_ECONOMY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{RESOURCE_ECONOMY_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.resourceStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.economySummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.health} value={`${bundle.resourceHealthPct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.attention} value={`${bundle.attentionEfficiencyPct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.compute} value={`${bundle.computePressurePct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.recursive} value={`${bundle.recursivePressurePct}%`} />
        <Metric
          label={RESOURCE_ECONOMY_UI_LABELS_JA.saturation}
          value={`${bundle.orchestrationSaturationPct}%`}
        />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.speculative} value={`${bundle.speculativeWastePct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.reflection} value={`${bundle.reflectionFatiguePct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.battery} value={`${bundle.batteryPressurePct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.latency} value={`${bundle.latencyInflationPct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.waste} value={`${bundle.computeWastePct}%`} />
        <Metric label={RESOURCE_ECONOMY_UI_LABELS_JA.mobile} value={`${bundle.mobilePressurePct}%`} />
      </View>

      {bundle.layerUtilityRanking.length > 0 ? (
        <View style={styles.utility}>
          <Text style={styles.utilityTitle}>{RESOURCE_ECONOMY_UI_LABELS_JA.utility}</Text>
          {bundle.layerUtilityRanking.slice(0, 4).map((l) => (
            <SelectableText key={l.layerId} style={styles.utilityItem}>
              {l.labelJa}: utility {l.utilityPct}% · cost {l.costPct}%
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · hiddenComputeForbidden=
        {String(bundle.hiddenComputeForbidden)} · budget={bundle.orchestrationBudgetMax}
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
  utility: { marginTop: theme.spacing.sm },
  utilityTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  utilityItem: { fontSize: 11, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
