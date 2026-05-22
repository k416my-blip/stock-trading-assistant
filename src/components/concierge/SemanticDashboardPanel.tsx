import { StyleSheet, Text, View } from 'react-native';
import { SEMANTIC_UI_LABELS_JA } from '../../constants/semanticConsistencyDecisionCoherence';
import type { SemanticConsistencyDecisionCoherenceBundle } from '../../types/semanticConsistencyDecisionCoherence';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: SemanticConsistencyDecisionCoherenceBundle;
};

function scoreColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function SemanticDashboardPanel({ bundle }: Props) {
  const color = scoreColor(bundle.finalDecisionCoherenceScore);

  return (
    <View style={styles.wrap} testID="concierge-semantic-dashboard-panel">
      <Text style={styles.title}>{SEMANTIC_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{SEMANTIC_UI_LABELS_JA.coherence}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.finalDecisionCoherenceScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.semanticSummaryJa}</SelectableText>

      <View style={styles.metricsRow}>
        <Metric label={SEMANTIC_UI_LABELS_JA.nlIntegrity} value={`${bundle.naturalLanguageIntegrityScore}`} />
        <Metric label={SEMANTIC_UI_LABELS_JA.direction} value={bundle.semanticDirectionLabelJa} />
        <Metric
          label="Merged conf."
          value={`${bundle.explainabilityConfidenceMerged}`}
        />
        <Metric label={SEMANTIC_UI_LABELS_JA.freshness} value={bundle.explanationFreshnessJa} />
      </View>

      {bundle.semanticFreeze ? (
        <SelectableText style={styles.warn}>
          {SEMANTIC_UI_LABELS_JA.freeze}: {bundle.emergencyNarrativeFallbackJa}
        </SelectableText>
      ) : null}

      <Section
        title={SEMANTIC_UI_LABELS_JA.contradiction}
        lines={
          bundle.contradictionLanguageJa.length > 0
            ? bundle.contradictionLanguageJa.map((c) => `· ${c}`)
            : ['· なし']
        }
      />
      <Section
        title={SEMANTIC_UI_LABELS_JA.unsupported}
        lines={
          bundle.unsupportedClaimsJa.length > 0
            ? bundle.unsupportedClaimsJa.map((c) => `· ${c}`)
            : ['· なし']
        }
      />
      <Section
        title={SEMANTIC_UI_LABELS_JA.stale}
        lines={
          bundle.staleExplanationJa.length > 0
            ? bundle.staleExplanationJa.map((c) => `· ${c}`)
            : ['· なし']
        }
      />

      {bundle.vetoNarrativeJa ? (
        <SelectableText style={styles.note}>
          {SEMANTIC_UI_LABELS_JA.veto}: {bundle.vetoNarrativeJa}
        </SelectableText>
      ) : null}
      {bundle.downgradeNarrativeJa ? (
        <SelectableText style={styles.note}>
          {SEMANTIC_UI_LABELS_JA.downgrade}: {bundle.downgradeNarrativeJa}
        </SelectableText>
      ) : null}
      <SelectableText style={styles.note}>
        {SEMANTIC_UI_LABELS_JA.confidence}: {bundle.confidenceWordingJa}
      </SelectableText>
      {bundle.driftedNarrativeJa ? (
        <SelectableText style={styles.note}>
          {SEMANTIC_UI_LABELS_JA.drift}: {bundle.driftedNarrativeJa}
        </SelectableText>
      ) : null}
      {bundle.semanticReplayDiffJa ? (
        <SelectableText style={styles.note}>Replay diff: {bundle.semanticReplayDiffJa}</SelectableText>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SEMANTIC_UI_LABELS_JA.consensus}</Text>
        {bundle.narrativeConsensus.map((r) => (
          <SelectableText key={r.sourceJa} style={styles.bullet}>
            · {r.sourceJa}: {r.direction} ({r.weightPct}%)
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Trace → Narrative</Text>
        {bundle.traceToNarrativeJa.slice(0, 5).map((line) => (
          <SelectableText key={line} style={styles.bullet}>
            {line}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.footer}>{bundle.explainRuleBasisJa}</SelectableText>
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
      {lines.map((line) => (
        <SelectableText key={line} style={styles.bullet}>
          {line}
        </SelectableText>
      ))}
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
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  note: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
