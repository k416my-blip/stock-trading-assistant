import { StyleSheet, Text, View } from 'react-native';
import { META_LABELS_JA } from '../../constants/metaDecision';
import type { MetaDecisionBundle } from '../../types/metaDecision';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: MetaDecisionBundle;
};

export function MetaTopPrioritiesPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-meta-top-priorities">
      <Text style={styles.title}>{META_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.budget}>{bundle.attentionBudgetJa}</SelectableText>
      {bundle.emergencyOverride ? (
        <Text style={styles.emergency}>緊急モード — 通常の表示制限を解除</Text>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{META_LABELS_JA.executive}</Text>
        <SelectableText style={styles.line}>{bundle.executiveSummary.marketJa}</SelectableText>
        <SelectableText style={styles.line}>最大リスク: {bundle.executiveSummary.maxRiskJa}</SelectableText>
        <SelectableText style={styles.line}>
          最大機会: {bundle.executiveSummary.maxOpportunityJa}
        </SelectableText>
        <SelectableText style={styles.line}>
          最重要銘柄: {bundle.executiveSummary.topSymbolJa}
        </SelectableText>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{META_LABELS_JA.focus}</Text>
        {bundle.topPriorities.map((p) => (
          <View key={p.rank} style={styles.priorityRow}>
            <Text style={styles.rank}>{p.rank}</Text>
            <View style={styles.priorityBody}>
              <SelectableText style={styles.priorityTitle}>{p.titleJa}</SelectableText>
              <SelectableText style={styles.why}>{p.whyImportantJa}</SelectableText>
              <Text style={styles.meta}>
                {p.kind === 'opportunity' ? '機会' : p.kind === 'risk' ? 'リスク' : '中立'} ·{' '}
                {p.compositeScore}点
              </Text>
            </View>
          </View>
        ))}
        {bundle.topPriorities.length === 0 ? (
          <SelectableText style={styles.muted}>本日の最重要は未選別 — 大きな変化なし</SelectableText>
        ) : null}
      </View>

      {bundle.opportunities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{META_LABELS_JA.opportunities}</Text>
          {bundle.opportunities.map((o) => (
            <SelectableText key={o.rank} style={styles.bullet}>
              {o.rank}. {o.titleJa} — {o.whyImportantJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.contradictions.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{META_LABELS_JA.contradictions}</Text>
          {bundle.contradictions.map((c) => (
            <SelectableText key={c.symbol} style={styles.bullet}>
              {c.labelJa}: {c.detailJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{META_LABELS_JA.queue}</Text>
        <SelectableText style={styles.muted}>
          統合 {bundle.mergedCount}件 · 抑制 {bundle.suppressedCount}件 · 承認{' '}
          {bundle.approvedCandidates.length}件
        </SelectableText>
        {bundle.decisionQueue.slice(0, 6).map((q) => (
          <SelectableText key={q.rank} style={styles.queueLine}>
            {q.rank}. [{q.event.timeframe}] {q.event.candidate.titleJa}
            {q.event.riskRewardJa ? ` — ${q.event.riskRewardJa}` : ''}
          </SelectableText>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: theme.colors.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  title: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.lg,
    marginBottom: 4,
  },
  budget: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  emergency: {
    color: theme.colors.danger,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginBottom: theme.spacing.xs,
  },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
  },
  line: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
  priorityRow: { flexDirection: 'row', marginBottom: 8, gap: 8 },
  rank: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: theme.fontSize.lg,
    width: 22,
  },
  priorityBody: { flex: 1 },
  priorityTitle: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  why: { color: theme.colors.primary, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 2 },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  bullet: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: 2 },
  queueLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
  muted: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
});
