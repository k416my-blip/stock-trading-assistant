import { StyleSheet, Text, View } from 'react-native';
import { SELF_ARCHITECTURE_UI_LABELS_JA } from '../../constants/selfEvolvingArchitectureReflectiveRefactor';
import type { SelfEvolvingArchitectureReflectiveRefactorBundle } from '../../types/selfEvolvingArchitectureReflectiveRefactor';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: SelfEvolvingArchitectureReflectiveRefactorBundle;
};

export function SelfArchitectureDashboardPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-self-architecture-dashboard-panel">
      <Text style={styles.title}>{SELF_ARCHITECTURE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.disclaimer}>{bundle.uncertaintyDisclaimerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{SELF_ARCHITECTURE_UI_LABELS_JA.state}</Text>
        <Text style={styles.scoreValue}>{bundle.structureStateLabelJa}</Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.architectureSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.health} value={`${bundle.architectureHealthPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.redundancy} value={`${bundle.redundancyPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.recursive} value={`${bundle.recursiveInflationPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.complexity} value={`${bundle.orchestrationComplexityPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.fragmentation} value={`${bundle.fragmentationPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.mobile} value={`${bundle.mobilePressurePct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.reflection} value={`${bundle.reflectionDensityPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.stale} value={`${bundle.stalePipelinesPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.governance} value={bundle.governanceApprovalStateJa} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.unsupported} value={`${bundle.unsupportedStructureRiskPct}%`} />
        <Metric label={SELF_ARCHITECTURE_UI_LABELS_JA.orchestration} value={bundle.orchestrationReviewJa} />
      </View>

      {bundle.optimizationProposals.length > 0 ? (
        <View style={styles.proposals}>
          <Text style={styles.proposalsTitle}>{SELF_ARCHITECTURE_UI_LABELS_JA.proposals}</Text>
          {bundle.optimizationProposals.map((p) => (
            <SelectableText key={p.id} style={styles.proposalItem}>
              {p.labelJa} — {p.detailJa}（sandbox · 承認待ち）
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} · autoRefactorForbidden=
        {String(bundle.automaticRefactorForbidden)} · proposalOnly={String(bundle.proposalOnlyMode)}
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
  proposals: { marginTop: theme.spacing.sm },
  proposalsTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  proposalItem: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
