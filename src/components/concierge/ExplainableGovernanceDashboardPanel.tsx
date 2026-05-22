import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { bundlePropsEqual } from './memoDashboardProps';
import { EXPLAINABLE_UI_LABELS_JA } from '../../constants/explainableGovernanceTransparentReasoning';
import type { ExplainableGovernanceTransparentReasoningBundle } from '../../types/explainableGovernanceTransparentReasoning';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ExplainableGovernanceTransparentReasoningBundle;
};

function ExplainableGovernanceDashboardPanelInner({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-explainable-governance-dashboard-panel">
      <Text style={styles.title}>{EXPLAINABLE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{EXPLAINABLE_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.explainableStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.explainableSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={EXPLAINABLE_UI_LABELS_JA.health} value={`${bundle.explainabilityHealthPct}%`} />
        <Metric label={EXPLAINABLE_UI_LABELS_JA.transparency} value={`${bundle.transparencyScorePct}%`} />
        <Metric label={EXPLAINABLE_UI_LABELS_JA.consistency} value={`${bundle.explanationConsistencyPct}%`} />
        <Metric label={EXPLAINABLE_UI_LABELS_JA.risk} value={`${bundle.explanationRiskPct}%`} />
        <Metric
          label={EXPLAINABLE_UI_LABELS_JA.override}
          value={`${bundle.overrideAccountabilityPct}%`}
        />
        <Metric
          label={EXPLAINABLE_UI_LABELS_JA.uncertainty}
          value={`${bundle.uncertaintyDisclosurePct}%`}
        />
      </View>

      {bundle.downgradeReasonsJa.length > 0 ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonTitle}>{EXPLAINABLE_UI_LABELS_JA.downgrade}</Text>
          {bundle.downgradeReasonsJa.slice(0, 4).map((r, i) => (
            <SelectableText key={`d-${i}`} style={styles.reasonLine}>
              · {r}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.freezeReasonsJa.length > 0 ? (
        <View style={styles.reasonBlock}>
          <Text style={styles.reasonTitle}>{EXPLAINABLE_UI_LABELS_JA.freeze}</Text>
          {bundle.freezeReasonsJa.slice(0, 4).map((r, i) => (
            <SelectableText key={`f-${i}`} style={styles.reasonLine}>
              · {r}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.orch}>
        {EXPLAINABLE_UI_LABELS_JA.orchestration}: {bundle.orchestrationRationaleJa}
      </SelectableText>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · rawCoTForbidden=
        {String(bundle.rawChainOfThoughtForbidden)} · budget={bundle.orchestrationBudgetMax}
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

export const ExplainableGovernanceDashboardPanel = memo(
  ExplainableGovernanceDashboardPanelInner,
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
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, color: theme.colors.text },
  reasonBlock: { marginTop: theme.spacing.sm },
  reasonTitle: { fontSize: 12, fontWeight: '600', color: theme.colors.textMuted, marginBottom: 4 },
  reasonLine: { fontSize: 12, color: theme.colors.text, marginBottom: 2 },
  orch: { fontSize: 12, color: theme.colors.text, marginTop: theme.spacing.sm },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
