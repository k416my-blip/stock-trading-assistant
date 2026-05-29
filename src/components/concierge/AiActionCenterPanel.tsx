import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  STRATEGY_ACTION_LABELS_JA,
  STRATEGY_UI_LABELS_JA,
  TACTICAL_MODE_LABELS_JA,
} from '../../constants/strategyExecution';
import {
  displayToneLabelJa,
  formatDataSourcesLine,
} from '../../services/portfolioAiEvaluationDisplay';
import type { StrategyExecutionBundle } from '../../types/strategyExecution';
import type {
  PortfolioAiDisplayTone,
  PortfolioAiSymbolEvaluation,
} from '../../types/portfolioAiEvaluation';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

type Props = {
  bundle: StrategyExecutionBundle;
};

function toneColor(tone: PortfolioAiDisplayTone): string {
  switch (tone) {
    case 'buy':
      return theme.colors.success;
    case 'sell':
      return theme.colors.danger;
    default:
      return theme.colors.warning;
  }
}

function toneBg(tone: PortfolioAiDisplayTone): string {
  switch (tone) {
    case 'buy':
      return 'rgba(34, 197, 94, 0.12)';
    case 'sell':
      return 'rgba(239, 68, 68, 0.12)';
    default:
      return 'rgba(245, 158, 11, 0.12)';
  }
}

function PortfolioEvalRow({ item }: { item: PortfolioAiSymbolEvaluation }) {
  const color = toneColor(item.displayTone);
  const bg = toneBg(item.displayTone);

  return (
    <View
      style={[styles.rankRow, { borderLeftColor: color, backgroundColor: bg }]}
      testID={`portfolio-ai-rank-${item.symbol}`}
    >
      <View style={styles.rankHeader}>
        <SelectableText style={styles.rankNum}>#{item.rank}</SelectableText>
        <SelectableText style={styles.rankTitle}>
          {item.displayLabelJa} ({item.symbol})
        </SelectableText>
        <View style={[styles.toneChip, { borderColor: color }]}>
          <Text style={[styles.toneChipText, { color }]}>{displayToneLabelJa(item.displayTone)}</Text>
        </View>
      </View>
      <SelectableText style={styles.rankScore}>スコア {item.finalScore}/100</SelectableText>
      <SelectableText style={styles.recAiMetrics} testID={`ai-eval-metrics-${item.symbol}`}>
        action {item.action} · confidence {item.confidence}%
        {item.rsi14 != null ? ` · RSI ${item.rsi14}` : ''}
        {item.rsiSource ? ` (${item.rsiSource})` : ''}
      </SelectableText>
      <SelectableText style={styles.recAiRationale} testID={`ai-eval-rationale-${item.symbol}`}>
        rationaleJa: {item.rationaleJa}
      </SelectableText>
      <SelectableText style={styles.sourceLine}>
        {STRATEGY_UI_LABELS_JA.dataSources}: {formatDataSourcesLine(item.dataSources)}
      </SelectableText>
    </View>
  );
}

function HighlightList({
  title,
  items,
  testIdPrefix,
}: {
  title: string;
  items: PortfolioAiSymbolEvaluation[];
  testIdPrefix: string;
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section} testID={testIdPrefix}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <PortfolioEvalRow key={`${testIdPrefix}-${item.symbol}`} item={item} />
      ))}
    </View>
  );
}

export function AiActionCenterPanel({ bundle }: Props) {
  const portfolio = bundle.portfolioAiEvaluation;
  const scoreColor = useMemo(() => {
    if (!portfolio) return theme.colors.textMuted;
    if (portfolio.portfolioScore >= 62) return theme.colors.success;
    if (portfolio.portfolioScore <= 38) return theme.colors.danger;
    return theme.colors.warning;
  }, [portfolio]);

  return (
    <View style={styles.wrap} testID="concierge-ai-action-center">
      <Text style={styles.title}>{STRATEGY_UI_LABELS_JA.panelTitle}</Text>
      <SelectableText style={styles.meta}>
        戦術 {TACTICAL_MODE_LABELS_JA[bundle.tacticalMode]} · {bundle.regimeStrategyJa}
      </SelectableText>

      {portfolio ? (
        <>
          <View style={styles.scoreBox} testID="portfolio-ai-overall-score">
            <Text style={styles.scoreLabel}>{STRATEGY_UI_LABELS_JA.portfolioScore}</Text>
            <Text style={[styles.scoreValue, { color: scoreColor }]}>{portfolio.portfolioScore}</Text>
            <Text style={styles.scoreSub}>/ 100 · 保有 {portfolio.holdingCount} 銘柄</Text>
          </View>

          <SelectableText style={styles.updatedAt} testID="portfolio-ai-evaluated-at">
            {STRATEGY_UI_LABELS_JA.evaluatedAt}: {portfolio.evaluatedAtJa} · ソース:{' '}
            {portfolio.batchSource}
          </SelectableText>

          <HighlightList
            title={STRATEGY_UI_LABELS_JA.bestToday}
            items={portfolio.bestToday}
            testIdPrefix="portfolio-ai-best-today"
          />

          <HighlightList
            title={STRATEGY_UI_LABELS_JA.worstToday}
            items={portfolio.worstToday}
            testIdPrefix="portfolio-ai-worst-today"
          />

          {portfolio.riskWarnings.length > 0 ? (
            <View style={styles.section} testID="portfolio-ai-danger-alerts">
              <Text style={[styles.sectionTitle, { color: theme.colors.danger }]}>
                {STRATEGY_UI_LABELS_JA.riskWarnings}
              </Text>
              {portfolio.riskWarnings.map((w, i) => (
                <SelectableText key={`risk-${i}`} style={styles.riskLine}>
                  · {w}
                </SelectableText>
              ))}
            </View>
          ) : null}

          <View style={styles.section} testID="portfolio-ai-ranking-all">
            <Text style={styles.sectionTitle}>{STRATEGY_UI_LABELS_JA.ranking}</Text>
            {portfolio.rankedHoldings.map((item) => (
              <PortfolioEvalRow key={item.symbol} item={item} />
            ))}
          </View>
        </>
      ) : (
        <SelectableText style={styles.meta}>ポートフォリオ AI 評価を読み込み中…</SelectableText>
      )}

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
      </View>

      {bundle.todayRecommendations.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{STRATEGY_UI_LABELS_JA.today}</Text>
          {bundle.todayRecommendations.map((r) => (
            <SelectableText key={`today-${r.symbol}`} style={styles.rankLine}>
              {r.displayLabelJa} — {STRATEGY_ACTION_LABELS_JA[r.action]} ({r.confidencePct}%)
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
  scoreBox: {
    alignItems: 'center',
    paddingVertical: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.08)',
  },
  scoreLabel: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  scoreValue: { fontSize: 40, fontWeight: '800', lineHeight: 48 },
  scoreSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  updatedAt: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  cooldown: { color: theme.colors.warning, fontSize: theme.fontSize.sm, marginBottom: theme.spacing.xs },
  summaryBox: {
    padding: theme.spacing.xs,
    marginTop: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(34, 197, 94, 0.06)',
  },
  summaryLine: { color: theme.colors.text, fontSize: theme.fontSize.sm, lineHeight: 20, marginBottom: 2 },
  section: { marginTop: theme.spacing.sm },
  sectionTitle: {
    color: theme.colors.text,
    fontWeight: '600',
    fontSize: theme.fontSize.sm,
    marginBottom: 6,
  },
  rankRow: {
    marginBottom: 8,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    borderLeftWidth: 4,
  },
  rankHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  rankNum: { color: theme.colors.textMuted, fontWeight: '700', fontSize: theme.fontSize.sm },
  rankTitle: { color: theme.colors.text, fontWeight: '600', fontSize: theme.fontSize.sm, flex: 1 },
  rankScore: { color: theme.colors.primary, fontSize: theme.fontSize.sm, marginTop: 2 },
  toneChip: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  toneChipText: { fontSize: 11, fontWeight: '700' },
  recAiMetrics: {
    color: theme.colors.text,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: 4,
  },
  recAiRationale: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    lineHeight: 18,
    marginTop: 2,
  },
  sourceLine: { color: theme.colors.textMuted, fontSize: 11, marginTop: 4 },
  riskLine: { color: theme.colors.danger, fontSize: theme.fontSize.sm, lineHeight: 18, marginBottom: 4 },
  rankLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 18 },
});
