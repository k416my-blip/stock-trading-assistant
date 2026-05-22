import { StyleSheet, Text, View } from 'react-native';
import { STRATEGY_ACTION_LABELS_JA, STRATEGY_UI_LABELS_JA, TACTICAL_MODE_LABELS_JA } from '../../constants/strategyExecution';
import type { StrategyExecutionBundle, StrategySymbolRecommendation } from '../../types/strategyExecution';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: StrategyExecutionBundle;
};

function RecRow({ r }: { r: StrategySymbolRecommendation }) {
  return (
    <View style={styles.recRow}>
      <SelectableText style={styles.recTitle}>
        {r.displayLabelJa} — {STRATEGY_ACTION_LABELS_JA[r.action]} ({r.confidencePct}%)
      </SelectableText>
      <SelectableText style={styles.recMeta}>
        {r.intent === 'action' ? '行動検討' : '面白い（様子見）'} · {r.riskReward.summaryJa}
      </SelectableText>
      <SelectableText style={styles.recWhy}>{r.analystExplanationJa}</SelectableText>
    </View>
  );
}

function Section({
  title,
  items,
}: {
  title: string;
  items: StrategySymbolRecommendation[];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((r) => (
        <RecRow key={`${r.symbol}-${r.action}`} r={r} />
      ))}
    </View>
  );
}

export function AiActionCenterPanel({ bundle }: Props) {
  return (
    <View style={styles.wrap} testID="concierge-ai-action-center">
      <Text style={styles.title}>{STRATEGY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.meta}>
        戦術 {TACTICAL_MODE_LABELS_JA[bundle.tacticalMode]} · {bundle.regimeStrategyJa} ·{' '}
        {STRATEGY_UI_LABELS_JA.confidence} {bundle.overallConfidencePct}%
      </SelectableText>
      {bundle.cooldownNoteJa ? (
        <SelectableText style={styles.cooldown}>{bundle.cooldownNoteJa}</SelectableText>
      ) : null}

      <View style={styles.summaryBox}>
        <SelectableText style={styles.summaryLine}>
          {STRATEGY_UI_LABELS_JA.cash}: 現金 {bundle.allocation.recommendedCashRatioPct}% 目安 —{' '}
          {bundle.allocation.cashRatioRationaleJa}
        </SelectableText>
        <SelectableText style={styles.summaryLine}>
          {STRATEGY_UI_LABELS_JA.allocation}: {bundle.allocation.sectorBalanceJa} ·{' '}
          {bundle.allocation.concentrationJa}
        </SelectableText>
        {bundle.predictionAccuracyJa ? (
          <SelectableText style={styles.summaryLine}>
            予測精度: {bundle.predictionAccuracyJa}
          </SelectableText>
        ) : null}
      </View>

      <Section title={STRATEGY_UI_LABELS_JA.today} items={bundle.todayRecommendations} />
      <Section title={STRATEGY_UI_LABELS_JA.danger} items={bundle.dangerAvoid} />
      <Section title={STRATEGY_UI_LABELS_JA.watch} items={bundle.watchList} />
      <Section title={STRATEGY_UI_LABELS_JA.highExpectancy} items={bundle.highExpectancy} />

      {bundle.opportunities.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>期待値ランキング</Text>
          {bundle.opportunities.slice(0, 4).map((o) => (
            <SelectableText key={o.rank} style={styles.rankLine}>
              {o.rank}. {o.labelJa} — {o.score}点
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.threats.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>危険ランキング</Text>
          {bundle.threats.slice(0, 4).map((t) => (
            <SelectableText key={t.rank} style={styles.rankLine}>
              {t.rank}. {t.labelJa} — {t.score}点
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.macroNotes.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{STRATEGY_UI_LABELS_JA.macro}</Text>
          {bundle.macroNotes.map((m) => (
            <SelectableText key={m.labelJa} style={styles.rankLine}>
              {m.labelJa}: {m.impactJa}
            </SelectableText>
          ))}
        </View>
      ) : null}

      {bundle.journalRecent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{STRATEGY_UI_LABELS_JA.journal}</Text>
          {bundle.journalRecent.map((j) => (
            <SelectableText key={j.id} style={styles.rankLine}>
              {j.action} {j.symbol ?? ''}: {j.whyProposedJa.slice(0, 80)}
            </SelectableText>
          ))}
        </View>
      ) : null}
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
    borderColor: theme.colors.success,
  },
  title: {
    color: theme.colors.success,
    fontWeight: '700',
    fontSize: theme.fontSize.lg,
    marginBottom: 4,
  },
  meta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  cooldown: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  summaryBox: {
    padding: theme.spacing.xs,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  summaryLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: 2 },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
  },
  recRow: { marginBottom: 8 },
  recTitle: { color: theme.colors.text, fontSize: theme.fontSize.sm, fontWeight: '600' },
  recMeta: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, marginTop: 2 },
  recWhy: { color: theme.colors.primary, fontSize: theme.fontSize.sm, lineHeight: 18, marginTop: 4 },
  rankLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
