import { StyleSheet, Text, View } from 'react-native';
import { TRACE_UI_LABELS_JA } from '../../constants/explainableCognitiveTrace';
import type { ExplainableCognitiveTraceBundle } from '../../types/explainableCognitiveTrace';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: ExplainableCognitiveTraceBundle;
};

function scoreColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ExplainabilityDashboardPanel({ bundle }: Props) {
  const color = scoreColor(bundle.explainableScore);

  return (
    <View style={styles.wrap} testID="concierge-explainability-dashboard-panel">
      <Text style={styles.title}>{TRACE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.decisionRow}>
        <Text style={styles.decisionLabel}>{TRACE_UI_LABELS_JA.finalDecision}</Text>
        <Text style={styles.decisionValue}>{bundle.finalDecisionLabelJa}</Text>
      </View>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{TRACE_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.explainableScore}/100 ({bundle.explainabilityHealthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.explainableSummaryJa}</SelectableText>
      <SelectableText style={styles.reflect}>{bundle.aiSelfReflectionJa}</SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{TRACE_UI_LABELS_JA.reasoning}</Text>
        {bundle.reasoningChainJa.map((line) => (
          <SelectableText key={line} style={styles.bullet}>
            · {line}
          </SelectableText>
        ))}
      </View>

      {bundle.vetoExplanationJa ? (
        <View style={styles.box}>
          <Text style={styles.boxLabel}>{TRACE_UI_LABELS_JA.veto}</Text>
          <SelectableText style={styles.boxText}>{bundle.vetoExplanationJa}</SelectableText>
        </View>
      ) : null}

      {bundle.conflictExplanationJa ? (
        <SelectableText style={styles.warn}>
          {TRACE_UI_LABELS_JA.contradiction}: {bundle.conflictExplanationJa}
        </SelectableText>
      ) : null}

      {bundle.downgradeReasonChain.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{TRACE_UI_LABELS_JA.downgrade}</Text>
          {bundle.downgradeReasonChain.map((line) => (
            <SelectableText key={line} style={styles.bullet}>
              · {line}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{TRACE_UI_LABELS_JA.influence}</Text>
        {bundle.influenceGraph.slice(0, 6).map((e) => (
          <SelectableText key={`${e.from}-${e.to}`} style={styles.bullet}>
            · {e.from} → {e.to} ({e.weightPct}%): {e.noteJa}
          </SelectableText>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{TRACE_UI_LABELS_JA.confidence}</Text>
        {bundle.confidenceEvolution.slice(-5).map((p) => (
          <SelectableText key={`${p.at}-${p.layerId}`} style={styles.bullet}>
            · {p.layerId}: {p.confidencePct}%
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.note}>
        {TRACE_UI_LABELS_JA.freshness}: {bundle.dataFreshnessTraceJa.join(' · ')}
      </SelectableText>
      {bundle.strategyDriftJa ? (
        <SelectableText style={styles.note}>
          {TRACE_UI_LABELS_JA.drift}: {bundle.strategyDriftJa}
        </SelectableText>
      ) : null}

      {bundle.replayTimeline.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{TRACE_UI_LABELS_JA.replay}</Text>
          {bundle.replayTimeline.slice(-3).map((r) => (
            <SelectableText key={r.id} style={styles.bullet}>
              · {r.at.slice(0, 16)} {r.finalDecision} ({r.explainableScore})
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.decisionComparatorJa ? (
        <SelectableText style={styles.note}>比較: {bundle.decisionComparatorJa}</SelectableText>
      ) : null}

      <SelectableText style={styles.footer}>{bundle.explainRuleBasisJa}</SelectableText>
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
  decisionRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  decisionLabel: { fontSize: 13, color: theme.colors.textMuted },
  decisionValue: { fontSize: 18, fontWeight: '700', color: theme.colors.primary },
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.xs },
  scoreLabel: { fontSize: 13, color: theme.colors.textMuted },
  scoreValue: { fontSize: 15, fontWeight: '700' },
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.xs },
  reflect: { fontSize: 12, fontStyle: 'italic', color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  box: { padding: theme.spacing.sm, backgroundColor: theme.colors.background, borderRadius: theme.radius.md, marginBottom: theme.spacing.sm },
  boxLabel: { fontSize: 12, fontWeight: '600', color: theme.colors.warning },
  boxText: { fontSize: 12, color: theme.colors.text, marginTop: 4 },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.xs },
  note: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
