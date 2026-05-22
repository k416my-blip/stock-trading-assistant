import { StyleSheet, Text, View } from 'react-native';
import { ADAPTIVE_EXPLORATION_UI_LABELS_JA } from '../../constants/adaptiveExplorationAntiDogma';
import type { AdaptiveExplorationAntiDogmaBundle } from '../../types/adaptiveExplorationAntiDogma';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: AdaptiveExplorationAntiDogmaBundle;
};

export function AdaptiveExplorationDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-adaptive-exploration-dashboard-panel">
      <Text style={styles.title}>{ADAPTIVE_EXPLORATION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{ADAPTIVE_EXPLORATION_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.explorationStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.explorationSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.health} value={`${bundle.explorationHealthPct}%`} />
        <Metric label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.dogma} value={`${bundle.dogmaPressurePct}%`} />
        <Metric
          label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.strategyRigidity}
          value={`${bundle.strategyRigidityPct}%`}
        />
        <Metric
          label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.consensusStagnation}
          value={`${bundle.consensusStagnationPct}%`}
        />
        <Metric
          label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.epistemicRigidity}
          value={`${bundle.epistemicRigidityPct}%`}
        />
        <Metric label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.novelty} value={`${bundle.noveltyBalancePct}%`} />
        <Metric
          label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.flexibility}
          value={`${bundle.adaptiveFlexibilityPct}%`}
        />
        <Metric label={ADAPTIVE_EXPLORATION_UI_LABELS_JA.margin} value={`${bundle.safeExplorationMarginPct}%`} />
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
