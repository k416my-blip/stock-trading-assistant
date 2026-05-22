import { StyleSheet, Text, View } from 'react-native';
import { REFLECTION_UI_LABELS_JA } from '../../constants/metaCognitiveRiskReflectionSelfCritique';
import type { MetaCognitiveRiskReflectionSelfCritiqueBundle } from '../../types/metaCognitiveRiskReflectionSelfCritique';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: MetaCognitiveRiskReflectionSelfCritiqueBundle;
};

function scoreColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function MetaAuditDashboardPanel({ bundle }: Props) {
  const critiqueColor = scoreColor(bundle.selfCritiqueScore);
  const metaColor = scoreColor(bundle.metaConfidencePct);

  return (
    <View style={styles.wrap} testID="concierge-meta-audit-dashboard-panel">
      <Text style={styles.title}>{REFLECTION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{REFLECTION_UI_LABELS_JA.selfCritique}</Text>
        <Text style={[styles.scoreValue, { color: critiqueColor }]}>
          {bundle.selfCritiqueScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{REFLECTION_UI_LABELS_JA.metaConfidence}</Text>
        <Text style={[styles.scoreValue, { color: metaColor }]}>
          {bundle.metaConfidencePct}%
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.selfCritiqueSummaryJa}</SelectableText>

      {bundle.metaWarningJa ? (
        <SelectableText style={styles.warn}>
          {REFLECTION_UI_LABELS_JA.warning}: {bundle.metaWarningJa}
        </SelectableText>
      ) : null}
      {bundle.reflectionSafeMode ? (
        <SelectableText style={styles.warn}>
          {REFLECTION_UI_LABELS_JA.safeMode}: watch / hold only
        </SelectableText>
      ) : null}

      <View style={styles.metricsRow}>
        <Metric label={REFLECTION_UI_LABELS_JA.drift} value={`${bundle.confidenceDriftPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.fatigue} value={`${bundle.fatigueScore}`} />
        <Metric label={REFLECTION_UI_LABELS_JA.bullish} value={`${bundle.bullishBiasPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.bearish} value={`${bundle.bearishBiasPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.rollback} value={`${bundle.rollbackDependencyPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.freeze} value={`${bundle.freezeFrequencyPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.unsupported} value={`${bundle.unsupportedTrendPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.contradiction} value={`${bundle.contradictionTrendPct}%`} />
        <Metric label={REFLECTION_UI_LABELS_JA.stability} value={`${bundle.recommendationStabilityPct}`} />
        <Metric label={REFLECTION_UI_LABELS_JA.longitudinal} value={`${bundle.longitudinalConsistencyPct}`} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{REFLECTION_UI_LABELS_JA.timeline}</Text>
        {bundle.driftTimeline.slice(-4).map((p) => (
          <SelectableText key={p.at} style={styles.bullet}>
            · {p.at.slice(11, 19)} drift {p.confidenceDriftPct}% meta {p.metaConfidencePct}% fatigue{' '}
            {p.fatigueScore}
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
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
