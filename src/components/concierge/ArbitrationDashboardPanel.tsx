import { StyleSheet, Text, View } from 'react-native';
import { ARBITRATION_UI_LABELS_JA } from '../../constants/cognitiveGoalArbitrationIntentPriority';
import type { CognitiveGoalArbitrationIntentPriorityBundle } from '../../types/cognitiveGoalArbitrationIntentPriority';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: CognitiveGoalArbitrationIntentPriorityBundle;
};

function healthColor(score: number) {
  if (score >= 75) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function ArbitrationDashboardPanel({ bundle }: Props) {
  const color = healthColor(bundle.arbitrationHealthScore);

  return (
    <View style={styles.wrap} testID="concierge-arbitration-dashboard-panel">
      <Text style={styles.title}>{ARBITRATION_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{ARBITRATION_UI_LABELS_JA.health}</Text>
        <Text style={[styles.scoreValue, { color }]}>
          {bundle.arbitrationHealthScore}/100 ({bundle.healthLabelJa})
        </Text>
      </View>

      <SelectableText style={styles.summary}>{bundle.arbitrationSummaryJa}</SelectableText>
      <SelectableText style={styles.narrative}>{bundle.priorityNarrativeJa}</SelectableText>

      {bundle.emergencySafeMode ? (
        <SelectableText style={styles.warn}>
          {ARBITRATION_UI_LABELS_JA.safeMode}: watch / hold only
        </SelectableText>
      ) : null}

      <Section
        title={ARBITRATION_UI_LABELS_JA.priority}
        lines={bundle.priorityOrderJa.map((p) => `· ${p}`)}
      />
      <Section
        title={ARBITRATION_UI_LABELS_JA.goals}
        lines={bundle.activeGoals
          .filter((g) => g.active)
          .map((g) => `· ${g.labelJa} rank${g.priorityRank} score${g.priorityScore}${g.isolated ? ' [isolated]' : ''}`)}
      />
      <Section
        title={ARBITRATION_UI_LABELS_JA.conflicts}
        lines={
          bundle.arbitrationConflicts.length > 0
            ? bundle.arbitrationConflicts.map(
                (c) => `· ${c.layersJa}: ${c.conflictJa} → ${c.winnerJa}`,
              )
            : ['· なし']
        }
      />

      <View style={styles.metricsRow}>
        <Metric label={ARBITRATION_UI_LABELS_JA.governance} value={bundle.governanceAuthorityJa.slice(0, 40)} />
        {bundle.semanticVetoJa ? (
          <Metric label={ARBITRATION_UI_LABELS_JA.semanticVeto} value="active" />
        ) : null}
        {bundle.reliabilityOverrideJa ? (
          <Metric label={ARBITRATION_UI_LABELS_JA.reliability} value="override" />
        ) : null}
      </View>

      {bundle.overrideReasonJa ? (
        <SelectableText style={styles.note}>
          {ARBITRATION_UI_LABELS_JA.override}: {bundle.overrideReasonJa}
        </SelectableText>
      ) : null}
      {bundle.freezeSourceJa ? (
        <SelectableText style={styles.note}>
          {ARBITRATION_UI_LABELS_JA.freeze}: {bundle.freezeSourceJa}
        </SelectableText>
      ) : null}
      {bundle.downgradeReasonJa ? (
        <SelectableText style={styles.note}>
          {ARBITRATION_UI_LABELS_JA.downgrade}: {bundle.downgradeReasonJa}
        </SelectableText>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{ARBITRATION_UI_LABELS_JA.stack}</Text>
        {bundle.goalStack.slice(0, 6).map((e) => (
          <SelectableText key={`${e.rank}-${e.goalId}`} style={styles.bullet}>
            · {e.rank}. {e.labelJa}: {e.reasonJa}
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
  summary: { fontSize: 13, color: theme.colors.text, marginBottom: theme.spacing.xs },
  narrative: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.sm },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm, marginBottom: theme.spacing.sm },
  metric: { minWidth: '45%', marginBottom: theme.spacing.xs },
  metricLabel: { fontSize: 11, color: theme.colors.textMuted },
  metricValue: { fontSize: 12, fontWeight: '600', color: theme.colors.text },
  warn: { fontSize: 12, color: theme.colors.warning, marginBottom: theme.spacing.sm },
  note: { fontSize: 12, color: theme.colors.textMuted, marginBottom: theme.spacing.xs },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginBottom: theme.spacing.xs },
  bullet: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 2 },
  footer: { fontSize: 11, color: theme.colors.textMuted, marginTop: theme.spacing.sm },
});
