import { StyleSheet, Text, View } from 'react-native';
import { CONSTITUTIONAL_UI_LABELS_JA } from '../../constants/constitutionalGovernanceSystemCoherence';
import type { ConstitutionalGovernanceSystemCoherenceBundle } from '../../types/constitutionalGovernanceSystemCoherence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ConstitutionalGovernanceSystemCoherenceBundle;
};

export function ConstitutionalGovernanceDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-constitutional-governance-dashboard-panel">
      <Text style={styles.title}>{CONSTITUTIONAL_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{CONSTITUTIONAL_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.constitutionalStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.constitutionalSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.health} value={`${bundle.constitutionalHealthPct}%`} />
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.coherence} value={`${bundle.systemCoherencePct}%`} />
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.conflict} value={`${bundle.conflictPressurePct}%`} />
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.collision} value={`${bundle.clampCollisionRiskPct}%`} />
        <Metric
          label={CONSTITUTIONAL_UI_LABELS_JA.hierarchy}
          value={`${bundle.governanceHierarchyIntegrityPct}%`}
        />
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.precedence} value={`${bundle.precedenceIntegrityPct}%`} />
        <Metric
          label={CONSTITUTIONAL_UI_LABELS_JA.contradiction}
          value={`${bundle.contradictionPressurePct}%`}
        />
        <Metric
          label={CONSTITUTIONAL_UI_LABELS_JA.orchestration}
          value={`${bundle.orchestrationConsistencyPct}%`}
        />
        <Metric label={CONSTITUTIONAL_UI_LABELS_JA.stability} value={`${bundle.systemStabilityIndexPct}%`} />
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
