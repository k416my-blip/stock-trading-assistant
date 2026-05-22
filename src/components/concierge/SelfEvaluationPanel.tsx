import { StyleSheet, Text, View } from 'react-native';
import { SELF_EVAL_UI_LABELS_JA } from '../../constants/selfEvaluation';
import type { SelfEvaluationBundle } from '../../types/selfEvaluation';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: SelfEvaluationBundle;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <SelectableText style={styles.value}>{value}</SelectableText>
    </View>
  );
}

export function SelfEvaluationPanel({ bundle }: Props) {
  const trustColor =
    bundle.trustScore >= 65
      ? theme.colors.success
      : bundle.trustScore >= 45
        ? theme.colors.warning
        : theme.colors.danger;

  return (
    <View style={styles.wrap} testID="concierge-self-evaluation-panel">
      <Text style={styles.title}>{SELF_EVAL_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>
      <SelectableText style={styles.local}>{bundle.localOnlyNoteJa}</SelectableText>

      {bundle.humilityMode && bundle.humilityMessageJa ? (
        <SelectableText style={styles.humility}>{bundle.humilityMessageJa}</SelectableText>
      ) : null}

      <View style={styles.trustBox}>
        <Text style={styles.trustLabel}>{SELF_EVAL_UI_LABELS_JA.trust}</Text>
        <Text style={[styles.trustScore, { color: trustColor }]}>{bundle.trustScore}</Text>
        <Text style={styles.trustSub}>/ 100</Text>
      </View>

      <Row
        label={SELF_EVAL_UI_LABELS_JA.accuracy}
        value={
          bundle.accuracy.overallWinRatePct != null
            ? `${bundle.accuracy.overallWinRatePct}% (${bundle.accuracy.evaluatedCount}件)`
            : 'データ不足'
        }
      />
      <Row
        label={SELF_EVAL_UI_LABELS_JA.quality}
        value={`${bundle.recommendationQualityScore}/100`}
      />
      <Row
        label={SELF_EVAL_UI_LABELS_JA.calibration}
        value={bundle.calibration.calibrationNoteJa}
      />
      <Row
        label="適応 confidence"
        value={`${bundle.adaptiveConfidencePct}% · 閾値 ${bundle.dynamicAlertThresholdPct}%`}
      />

      {bundle.biases.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.biases}</Text>
          {bundle.biases.map((b) => (
            <SelectableText key={b.kind} style={styles.bullet}>
              · {b.labelJa}: {b.detailJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.weaknesses.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.weaknesses}</Text>
          {bundle.weaknesses.map((w) => (
            <SelectableText key={w.kind} style={styles.bullet}>
              · {w.labelJa}: {w.detailJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <SelectableText style={styles.note}>
        {SELF_EVAL_UI_LABELS_JA.hallucination}: {bundle.hallucination.noteJa} (risk{' '}
        {bundle.hallucination.riskScore})
      </SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.heatmap}</Text>
        {bundle.confidenceHeatmap.map((c) => (
          <SelectableText key={c.bucketLabelJa} style={styles.bullet}>
            · {c.bucketLabelJa}: 予測 ~{c.predictedAvgPct}% → 実績{' '}
            {c.actualWinRatePct != null ? `${c.actualWinRatePct}%` : '—'} (n={c.sampleCount})
          </SelectableText>
        ))}
      </View>

      {bundle.mistakeReplay.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.mistakes}</Text>
          {bundle.mistakeReplay.slice(0, 3).map((m) => (
            <SelectableText key={m.id} style={styles.bullet}>
              · {m.symbol} {m.action}: {m.whyWrongJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.strategyFit}</Text>
        <SelectableText style={styles.note}>{bundle.adaptiveStrategyViewJa}</SelectableText>
        {bundle.strategyFitness.slice(0, 3).map((s) => (
          <SelectableText key={s.strategyLabelJa} style={styles.bullet}>
            · {s.strategyLabelJa}: {s.fitnessScore} — {s.noteJa}
          </SelectableText>
        ))}
      </View>

      <SelectableText style={styles.note}>リスク: {bundle.riskNarrativeJa}</SelectableText>
      <SelectableText style={styles.note}>変化: {bundle.whatChangedJa}</SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.explain}</Text>
        <SelectableText style={styles.explain}>{bundle.explainThinkingJa}</SelectableText>
      </View>

      {bundle.learningJournal.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{SELF_EVAL_UI_LABELS_JA.journal}</Text>
          {bundle.learningJournal.slice(0, 2).map((j) => (
            <SelectableText key={j.id} style={styles.bullet}>
              · {j.headlineJa}: {j.lessonJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.adaptiveAdjustmentsJa.length > 0 ? (
        <SelectableText style={styles.adaptive}>
          {SELF_EVAL_UI_LABELS_JA.adaptive}: {bundle.adaptiveAdjustmentsJa.join(' · ')}
        </SelectableText>
      ) : null}
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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  safety: {
    fontSize: 11,
    color: theme.colors.warning,
    marginBottom: 4,
  },
  local: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  humility: {
    fontSize: 12,
    color: theme.colors.primary,
    marginBottom: theme.spacing.sm,
    fontWeight: '600',
  },
  trustBox: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: theme.spacing.sm,
  },
  trustLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginRight: theme.spacing.sm,
  },
  trustScore: {
    fontSize: 28,
    fontWeight: '800',
  },
  trustSub: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginLeft: 4,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    gap: 8,
  },
  label: {
    fontSize: 12,
    color: theme.colors.textMuted,
    flex: 1,
  },
  value: {
    fontSize: 12,
    color: theme.colors.text,
    flex: 1.2,
    textAlign: 'right',
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 4,
  },
  bullet: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginBottom: 3,
  },
  note: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: 4,
  },
  explain: {
    fontSize: 12,
    color: theme.colors.text,
    lineHeight: 18,
  },
  adaptive: {
    fontSize: 11,
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
  },
});
