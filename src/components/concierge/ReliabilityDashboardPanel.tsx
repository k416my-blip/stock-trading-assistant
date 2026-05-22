import { StyleSheet, Text, View } from 'react-native';
import { EPISTEMIC_UI_LABELS_JA } from '../../constants/epistemicReliabilityEvidenceWeight';
import type { EpistemicReliabilityEvidenceWeightBundle } from '../../types/epistemicReliabilityEvidenceWeight';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: EpistemicReliabilityEvidenceWeightBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ReliabilityDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.reliabilityHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-reliability-dashboard-panel">
      <Text style={styles.title}>{EPISTEMIC_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{EPISTEMIC_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.reliabilityHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.reliabilitySummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={EPISTEMIC_UI_LABELS_JA.consensus} value={`${bundle.reliabilityConsensusPct}`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.governance} value={`${bundle.governanceAuthorityPct}`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.replay} value={`${bundle.replayTrustPct}`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.semantic} value={`${bundle.semanticTrustPct}`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.temporal} value={`${bundle.temporalTrustPct}`} />
        <Metric label={EPISTEMIC_UI_LABELS_JA.drift} value={`${bundle.confidenceDriftPct}`} />
      </View>

      {bundle.reliabilityFreeze ? (
        <SelectableText style={styles.warn}>
          {EPISTEMIC_UI_LABELS_JA.freeze}: {bundle.emergencyFallbackJa ?? 'active'}
        </SelectableText>
      ) : null}

      <Section
        title={EPISTEMIC_UI_LABELS_JA.layers}
        lines={bundle.layerReliability.map(
          (l) => `· ${l.labelJa}: ${l.reliabilityScore} (w${l.evidenceWeightPct}, fresh ${l.freshnessPct}%)`,
        )}
      />
      <Section
        title="Evidence weights"
        lines={bundle.evidenceWeights.slice(0, 6).map((e) => `· ${e.sourceJa}: ${e.weightPct}%`)}
      />
      <Section
        title={EPISTEMIC_UI_LABELS_JA.stale}
        lines={
          bundle.staleEvidenceJa.length > 0
            ? bundle.staleEvidenceJa.map((s) => `· ${s}`)
            : ['· なし']
        }
      />
      <Section
        title={EPISTEMIC_UI_LABELS_JA.unsupported}
        lines={
          bundle.unsupportedClaimsJa.length > 0
            ? bundle.unsupportedClaimsJa.map((s) => `· ${s}`)
            : ['· なし']
        }
      />

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{EPISTEMIC_UI_LABELS_JA.timeline}</Text>
        {bundle.reliabilityTimeline.slice(-4).map((p) => (
          <SelectableText key={p.at} style={styles.bullet}>
            · {p.at.slice(11, 19)} health {p.healthScore} consensus {p.consensusPct}
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

function Section({ title, lines }: { title: string; lines: string[] }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {lines.map((line, i) => (
        <SelectableText key={`${title}-${i}`} style={styles.bullet}>
          {line}
        </SelectableText>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: theme.spacing.sm,
    padding: theme.spacing.md,
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  safety: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs },
  scoreLabel: { color: theme.colors.textMuted, marginRight: theme.spacing.sm },
  scoreValue: { fontWeight: '700', fontSize: theme.fontSize.md },
  summary: { color: theme.colors.text, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '28%' },
  metricLabel: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
  metricValue: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
  warn: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.xs },
  sectionTitle: { fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  bullet: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  footer: { marginTop: theme.spacing.sm, fontSize: theme.fontSize.sm, color: theme.colors.textMuted },
});
