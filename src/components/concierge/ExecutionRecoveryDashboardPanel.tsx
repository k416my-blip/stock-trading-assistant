import { StyleSheet, Text, View } from 'react-native';
import {
  RECOVERY_STAGE_LABELS,
  RECOVERY_UI_LABELS_JA,
} from '../../constants/executionRecoveryAdaptiveConfidence';
import type { ExecutionRecoveryAdaptiveConfidenceBundle } from '../../types/executionRecoveryAdaptiveConfidence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ExecutionRecoveryAdaptiveConfidenceBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ExecutionRecoveryDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.recoveryHealthPct);

  return (
    <View style={styles.wrap} testID="concierge-execution-recovery-dashboard-panel">
      <Text style={styles.title}>{RECOVERY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{RECOVERY_UI_LABELS_JA.recoveryHealth}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.recoveryHealthPct}/100
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.recoverySummaryJa}</SelectableText>

      {bundle.recoveryBlocked ? (
        <SelectableText style={styles.warn}>Recovery blocked (safe mode / cascade respected)</SelectableText>
      ) : null}
      {bundle.recoverySuspended ? (
        <SelectableText style={styles.warn}>Recovery suspended (oscillation)</SelectableText>
      ) : null}
      {bundle.safeRecovery && bundle.partialRestoreActive ? (
        <SelectableText style={styles.ok}>Partial conservative restore active</SelectableText>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric label={RECOVERY_UI_LABELS_JA.adaptiveConfidence} value={`${bundle.adaptiveConfidencePct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.thawLevel} value={`${bundle.thawLevelPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.recoveryConsensus} value={`${bundle.recoveryConsensusPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.oscillation} value={`${bundle.oscillationRiskPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.freezeFreq} value={`${bundle.freezeFrequencyPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.rollbackDep} value={`${bundle.rollbackDependencyPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.cooldown} value={bundle.cooldownStatusJa} />
        <Metric
          label={RECOVERY_UI_LABELS_JA.stage}
          value={`${bundle.recoveryStage} (${RECOVERY_STAGE_LABELS[bundle.recoveryStage]})`}
        />
        <Metric label={RECOVERY_UI_LABELS_JA.thawState} value={bundle.thawState} />
        <Metric label={RECOVERY_UI_LABELS_JA.replay} value={bundle.replayIntegrityOk ? 'OK' : 'isolated'} />
        <Metric label={RECOVERY_UI_LABELS_JA.contradiction} value={`${bundle.contradictionTrendPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.unsupported} value={`${bundle.unsupportedTrendPct}%`} />
        <Metric label={RECOVERY_UI_LABELS_JA.recursiveRisk} value={`${bundle.recursiveRiskPct}%`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recovery timeline</Text>
        {bundle.recoveryTimeline.slice(-4).map((p) => (
          <SelectableText key={p.at} style={styles.bullet}>
            · {p.at.slice(11, 19)} health {p.recoveryHealth} thaw {p.thawLevel} stage {p.recoveryStage}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>
        realTradingEnabled={String(bundle.realTradingEnabled)} — {bundle.explainRuleBasisJa}
      </SelectableText>
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
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
  scoreValue: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '30%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  ok: { fontSize: 12, color: theme.colors.success, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
