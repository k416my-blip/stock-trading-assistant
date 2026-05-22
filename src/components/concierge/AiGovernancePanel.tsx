import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GOVERNANCE_UI_LABELS_JA } from '../../constants/aiGovernanceDecision';
import type { AiGovernanceDecisionBundle } from '../../types/aiGovernanceDecision';
import { updateHumanGovernanceOverride } from '../../services/aiGovernanceDecisionStorage';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: AiGovernanceDecisionBundle;
  onOverrideSaved?: () => void;
};

function scoreColor(score: number) {
  if (score >= 70) return theme.colors.success;
  if (score >= 50) return theme.colors.warning;
  return theme.colors.danger;
}

export function AiGovernancePanel({ bundle, onOverrideSaved }: Props) {
  const consensusColor = scoreColor(bundle.consensusScore);

  return (
    <View style={styles.wrap} testID="concierge-ai-governance-panel">
      <Text style={styles.title}>{GOVERNANCE_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.safety}>{bundle.safetyBannerJa}</SelectableText>

      {bundle.emergencyOverrideActive ? (
        <SelectableText style={styles.emergency}>{bundle.emergencyOverrideJa}</SelectableText>
      ) : null}

      <View style={styles.decisionRow}>
        <Text style={styles.decisionLabel}>{GOVERNANCE_UI_LABELS_JA.finalDecision}</Text>
        <Text style={styles.decisionValue}>{bundle.finalDecisionLabelJa}</Text>
      </View>

      {bundle.vetoLayerLabelJa ? (
        <View style={styles.vetoBox}>
          <Text style={styles.vetoLabel}>{GOVERNANCE_UI_LABELS_JA.veto}</Text>
          <SelectableText style={styles.vetoText}>
            {bundle.vetoLayerLabelJa} — {bundle.vetoReasonJa}
          </SelectableText>
        </View>
      ) : null}

      <View style={styles.scoreRow}>
        <Text style={styles.scoreLabel}>{GOVERNANCE_UI_LABELS_JA.consensus}</Text>
        <Text style={[styles.scoreValue, { color: consensusColor }]}>
          {bundle.consensusScore}/100
        </Text>
      </View>

      {bundle.contradictionDetected ? (
        <SelectableText style={styles.contradiction}>
          {GOVERNANCE_UI_LABELS_JA.contradiction}: {bundle.contradictionDetailJa}
        </SelectableText>
      ) : (
        <SelectableText style={styles.ok}>矛盾なし</SelectableText>
      )}

      <SelectableText style={styles.summary}>{bundle.unifiedAiSummaryJa}</SelectableText>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GOVERNANCE_UI_LABELS_JA.hierarchy}</Text>
        {bundle.activeHierarchy.map((row) => (
          <SelectableText key={row.layerId} style={styles.bullet}>
            · {row.rank}. {row.labelJa}: {row.stance}
            {row.active ? '' : ' (off)'}
            {row.stale ? ' [stale]' : ''} — conf {row.confidencePct}%
          </SelectableText>
        ))}
      </View>

      {bundle.blockedDecisions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{GOVERNANCE_UI_LABELS_JA.blocked}</Text>
          {bundle.blockedDecisions.map((line) => (
            <SelectableText key={line} style={styles.blocked}>
              · {line}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.downgradedRecommendations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Downgrade</Text>
          {bundle.downgradedRecommendations.slice(0, 5).map((d) => (
            <SelectableText key={d.symbol} style={styles.bullet}>
              · {d.symbol}: {d.fromAction} → {d.toAction} — {d.reasonJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{GOVERNANCE_UI_LABELS_JA.tree}</Text>
        {bundle.explainTree[0]?.children?.map((n) => (
          <SelectableText key={n.id} style={styles.bullet}>
            · {n.labelJa}: {n.outcomeJa}
          </SelectableText>
        ))}
      </View>

      {bundle.auditTrailPreview.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{GOVERNANCE_UI_LABELS_JA.audit}</Text>
          {bundle.auditTrailPreview.slice(-3).map((e) => (
            <SelectableText key={e.id} style={styles.bullet}>
              · {e.at.slice(0, 16)} {e.finalDecision} ({e.consensusScore})
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.overrideRow}>
        <Pressable
          onPress={() =>
            void updateHumanGovernanceOverride({ preferHold: !bundle.humanOverrideActive }).then(
              () => onOverrideSaved?.(),
            )
          }
          style={styles.overrideBtn}
        >
          <Text style={styles.overrideBtnText}>
            {bundle.humanOverrideActive ? '人間 override 解除' : '人間 override: 保有優先'}
          </Text>
        </Pressable>
      </View>

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
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  safety: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: theme.spacing.sm,
  },
  emergency: {
    fontSize: 13,
    color: theme.colors.danger,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  decisionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  decisionLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  decisionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  vetoBox: {
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.background,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.sm,
  },
  vetoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.warning,
  },
  vetoText: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 4,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  scoreLabel: {
    fontSize: 13,
    color: theme.colors.textMuted,
  },
  scoreValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  contradiction: {
    fontSize: 12,
    color: theme.colors.warning,
    marginBottom: theme.spacing.xs,
  },
  ok: {
    fontSize: 12,
    color: theme.colors.success,
    marginBottom: theme.spacing.xs,
  },
  summary: {
    fontSize: 13,
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  section: {
    marginTop: theme.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  bullet: {
    fontSize: 12,
    color: theme.colors.textMuted,
    marginBottom: 2,
  },
  blocked: {
    fontSize: 12,
    color: theme.colors.danger,
    marginBottom: 2,
  },
  overrideRow: {
    marginTop: theme.spacing.md,
  },
  overrideBtn: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.md,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
  },
  overrideBtnText: {
    fontSize: 13,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  footer: {
    fontSize: 11,
    color: theme.colors.textMuted,
    marginTop: theme.spacing.sm,
  },
});
