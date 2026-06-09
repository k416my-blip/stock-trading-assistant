import { useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { PORTFOLIO_AI_EVAL_UI_VERSION } from '../../constants/aiConciergeDevFlags';
import {
  STRATEGY_ACTION_LABELS_JA,
  STRATEGY_UI_LABELS_JA,
  TACTICAL_MODE_LABELS_JA,
} from '../../constants/strategyExecution';
import {
  displayToneLabelJa,
  formatDataSourcesLine,
} from '../../services/portfolioAiEvaluationDisplay';
import {
  buildRealDataPipelineReport,
  isMockFallbackSource,
  logActionCenterMetro,
  resolveAnalysisSummary,
  resolveSymbolProvider,
} from '../../services/actionCenterDiagnostics';
import {
  buildLiteTradeCandidates,
  buildPortfolioScoreBreakdown,
  isActionCenterMockData,
} from '../../services/actionCenterInsights';
import { buildAiDailyComment } from '../../services/aiDailyCommentBuilder';
import { useAiAnalystReport } from '../../hooks/useAiAnalystReport';
import { resolvePortfolioAiEvaluation } from '../../services/portfolioAiEvaluationFromStrategyBundle';
import { useApp } from '../../context/AppContext';
import type { StrategyExecutionBundle } from '../../types/strategyExecution';
import type {
  PortfolioAiDisplayTone,
  PortfolioAiSymbolEvaluation,
} from '../../types/portfolioAiEvaluation';
import { useUrgencySignalsOptional } from '../../context/UrgencySignalContext';
import { logDuplicateReactKeys, listKey } from '../../utils/reactKeyDiagnostics';
import { AiActionCenterApiVerification } from './AiActionCenterApiVerification';
import { AiActionCenterConnectionTest } from './AiActionCenterConnectionTest';
import { AiDailyCommentPanel } from './AiDailyCommentPanel';
import { AiAnalystReportPanel } from './AiAnalystReportPanel';
import { AI_ACTION_CENTER_LITE_MODE } from '../../constants/aiConciergeDevFlags';
import { SelectableText } from '../ui/SelectableText';
import { theme } from '../../theme';

const MISSING_JA = '未取得';

type Props = {
  bundle: StrategyExecutionBundle;
  /** 軽量モード: スコア + 接続テストのみ */
  liteMode?: boolean;
};

/** ベスト / ワースト / ランキングで同一 symbol が重複しても React key が衝突しない */
function evalRowReactKey(section: string, item: PortfolioAiSymbolEvaluation, index: number): string {
  return `${section}-rank${item.rank}-idx${index}-${item.symbol.toUpperCase()}`;
}

function PortfolioScoreBlock({
  portfolioScore,
  holdingCount,
  scoreColor,
  batchSource,
}: {
  portfolioScore: number;
  holdingCount: number;
  scoreColor: string;
  batchSource?: string;
}) {
  return (
    <View style={styles.scoreBox} testID="portfolio-ai-overall-score">
      <Text style={styles.scoreLabel}>{STRATEGY_UI_LABELS_JA.portfolioScore}</Text>
      <Text style={styles.scoreLabelEn}>{STRATEGY_UI_LABELS_JA.portfolioScoreEn}</Text>
      <Text style={[styles.scoreValue, { color: scoreColor }]} testID="portfolio-ai-score-value">
        {portfolioScore}
      </Text>
      <Text style={styles.scoreSub}>
        / 100 · 保有 {holdingCount > 0 ? holdingCount : 0} 銘柄
        {holdingCount === 0 ? `（${MISSING_JA}）` : ''}
      </Text>
      {batchSource ? (
        <SelectableText style={styles.batchSourceLine} testID="portfolio-ai-batch-source">
          データ取得元 · source: {batchSource}
        </SelectableText>
      ) : null}
    </View>
  );
}

function pipelineStatusColor(status: 'real' | 'partial' | 'mock' | 'skipped'): string {
  if (status === 'real') return theme.colors.success;
  if (status === 'partial') return theme.colors.warning;
  if (status === 'mock') return theme.colors.danger;
  return theme.colors.textMuted;
}

function AiActionCenterLiteEvalRow({
  item,
  bundle,
  batchSource,
  index,
}: {
  item: PortfolioAiSymbolEvaluation;
  bundle: StrategyExecutionBundle;
  batchSource: string;
  index: number;
}) {
  const provider = resolveSymbolProvider(item, batchSource);
  const analysisSummary = resolveAnalysisSummary(item, bundle);
  return (
    <View style={styles.liteEvalRow} testID={`portfolio-ai-lite-eval-${index}`}>
      <SelectableText style={styles.liteEvalTitle}>
        {item.displayLabelJa} ({item.symbol})
      </SelectableText>
      <SelectableText style={styles.liteEvalLine}>source: {batchSource || MISSING_JA}</SelectableText>
      <SelectableText style={styles.liteEvalLine}>provider: {provider}</SelectableText>
      <SelectableText style={styles.liteEvalLine}>dataSource: {provider}</SelectableText>
      <SelectableText style={styles.liteEvalLine}>
        rationaleJa: {item.rationaleJa || MISSING_JA}
      </SelectableText>
      <SelectableText style={styles.liteEvalLine}>
        analysisSummary: {analysisSummary}
      </SelectableText>
    </View>
  );
}

function LiteCandidateBlock({
  title,
  items,
}: {
  title: string;
  items: ReturnType<typeof buildLiteTradeCandidates>['buyCandidates'];
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <SelectableText style={styles.emptyLine}>{MISSING_JA}</SelectableText>
      ) : (
        items.map((item, idx) => (
          <View key={`${title}-${item.symbol}-${idx}`} style={styles.liteEvalRow}>
            <SelectableText style={styles.liteEvalTitle}>
              {item.symbol} {item.labelJa}
            </SelectableText>
            <SelectableText style={styles.liteEvalLine}>Score: {item.score}</SelectableText>
            <SelectableText style={styles.liteEvalLine}>理由:</SelectableText>
            {item.reasons.map((r, i) => (
              <SelectableText key={`${item.symbol}-reason-${i}`} style={styles.liteEvalLine}>
                ・{r}
              </SelectableText>
            ))}
            <SelectableText style={styles.liteEvalLine}>使用データ: {item.dataSource}</SelectableText>
            <SelectableText style={styles.liteEvalLine}>dataSource: {item.dataSource}</SelectableText>
          </View>
        ))
      )}
    </View>
  );
}

function RealDataPipelineTable({
  bundle,
  portfolio,
  apiHealth,
}: {
  bundle: StrategyExecutionBundle;
  portfolio: ReturnType<typeof resolvePortfolioAiEvaluation>;
  apiHealth: ReturnType<typeof useApp>['apiHealthDashboard'];
}) {
  const rows = buildRealDataPipelineReport(bundle, portfolio, apiHealth);
  return (
    <View style={styles.section} testID="portfolio-ai-pipeline-report">
      <Text style={styles.sectionTitle}>実データ稼働状況</Text>
      {rows.map((row, index) => (
        <View key={listKey('pipeline', index, row.layer)} style={styles.pipelineRow}>
          <Text style={[styles.pipelineStatus, { color: pipelineStatusColor(row.status) }]}>
            {row.status.toUpperCase()}
          </Text>
          <View style={styles.pipelineTextCol}>
            <Text style={styles.pipelineLayer}>{row.layer}</Text>
            <SelectableText style={styles.pipelineDetail}>{row.detailJa}</SelectableText>
          </View>
        </View>
      ))}
      {isMockFallbackSource(bundle, portfolio) ? (
        <SelectableText style={styles.mockWarn}>
          ⚠ raw hybrid source が mock_fallback です（表示 source は {portfolio.batchSource}）
        </SelectableText>
      ) : null}
    </View>
  );
}

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

function PortfolioEvalRow({
  item,
  sectionId,
  rowIndex,
}: {
  item: PortfolioAiSymbolEvaluation;
  sectionId: string;
  rowIndex: number;
}) {
  const color = toneColor(item.displayTone);
  const bg = toneBg(item.displayTone);
  const rsiLine =
    item.rsi14 != null
      ? ` · RSI ${item.rsi14}${item.rsiSource ? ` (${item.rsiSource})` : ''}`
      : ' · RSI 未取得';

  return (
    <View
      style={[styles.rankRow, { borderLeftColor: color, backgroundColor: bg }]}
      testID={`${sectionId}-row-${rowIndex}-${item.symbol}`}
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
        action {item.action} · confidence {item.confidence}%{rsiLine}
      </SelectableText>
      <SelectableText style={styles.recAiRationale} testID={`ai-eval-rationale-${item.symbol}`}>
        rationaleJa: {item.rationaleJa || MISSING_JA}
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
  return (
    <View style={styles.section} testID={testIdPrefix}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        <SelectableText style={styles.emptyLine}>{MISSING_JA}</SelectableText>
      ) : (
        (() => {
          const keys = items.map((item, index) => evalRowReactKey(testIdPrefix, item, index));
          logDuplicateReactKeys(
            `AiActionCenter/HighlightList/${testIdPrefix}`,
            'HighlightList',
            keys,
          );
          return items.map((item, index) => (
            <PortfolioEvalRow
              key={keys[index]}
              item={item}
              sectionId={testIdPrefix}
              rowIndex={index}
            />
          ));
        })()
      )}
    </View>
  );
}

export function AiActionCenterAwaitingBundle() {
  return (
    <View style={styles.wrap} testID="concierge-ai-action-center-awaiting">
      <Text style={styles.title}>{STRATEGY_UI_LABELS_JA.panelTitle}</Text>
      <PortfolioScoreBlock portfolioScore={50} holdingCount={0} scoreColor={theme.colors.textMuted} />
      <SelectableText style={styles.meta}>戦略バンドルを読み込み中…</SelectableText>
      <HighlightList title={STRATEGY_UI_LABELS_JA.bestToday} items={[]} testIdPrefix="portfolio-ai-best-today" />
      <HighlightList title={STRATEGY_UI_LABELS_JA.worstToday} items={[]} testIdPrefix="portfolio-ai-worst-today" />
      <View style={styles.section} testID="portfolio-ai-ranking-all">
        <Text style={styles.sectionTitle}>{STRATEGY_UI_LABELS_JA.ranking}</Text>
        <SelectableText style={styles.emptyLine}>{MISSING_JA}</SelectableText>
      </View>
    </View>
  );
}

export function AiActionCenterPanel({ bundle, liteMode = false }: Props) {
  const { apiHealthDashboard, state, twelveDataApiKey, analysisApiKeys } = useApp();
  const portfolio = useMemo(() => resolvePortfolioAiEvaluation(bundle), [bundle]);
  const activeHoldingCount = useMemo(
    () => state.portfolio.filter((p) => (p.shares ?? 0) > 0).length,
    [state.portfolio],
  );
  const showCandidateRanking = activeHoldingCount === 0;
  const urgency = useUrgencySignalsOptional();
  const dailyComment = useMemo(
    () =>
      buildAiDailyComment({
        bundle,
        portfolio,
        holdings: state.portfolio,
        dividends: state.dividends,
        activeSignals: urgency?.allSignals ?? [],
      }),
    [bundle, portfolio, state.portfolio, state.dividends, urgency?.allSignals],
  );
  const analystReport = useAiAnalystReport({
    portfolio,
    holdings: state.portfolio,
    twelveDataApiKey,
    newsApiKey: analysisApiKeys.newsApiKey,
  });
  const scoreColor = useMemo(() => {
    if (portfolio.portfolioScore >= 62) return theme.colors.success;
    if (portfolio.portfolioScore <= 38) return theme.colors.danger;
    return theme.colors.warning;
  }, [portfolio.portfolioScore]);

  const isLite = liteMode || AI_ACTION_CENTER_LITE_MODE;
  const holdingSymbols = useMemo(
    () =>
      new Set(
        state.portfolio
          .filter((p) => (p.shares ?? 0) > 0)
          .map((p) => p.symbol.toUpperCase()),
      ),
    [state.portfolio],
  );
  const holdingRanked = useMemo(
    () => portfolio.rankedHoldings.filter((e) => holdingSymbols.has(e.symbol.toUpperCase())),
    [portfolio.rankedHoldings, holdingSymbols],
  );
  const liteEvalItems = (showCandidateRanking ? portfolio.rankedHoldings : holdingRanked).slice(0, 3);
  const scoreBreakdown = useMemo(
    () => buildPortfolioScoreBreakdown({ portfolio, holdings: state.portfolio }),
    [portfolio, state.portfolio],
  );
  const candidates = useMemo(
    () => buildLiteTradeCandidates({ portfolio, bundle }),
    [portfolio, bundle],
  );
  const isMockData = useMemo(
    () => isActionCenterMockData(bundle, portfolio) || isMockFallbackSource(bundle, portfolio),
    [bundle, portfolio],
  );

  useEffect(() => {
    logActionCenterMetro({
      bundle,
      portfolio,
      signalCount: urgency?.allSignals.length ?? 0,
      hybridSkipped: !bundle.hybridSecondEvaluator,
      apiHealth: apiHealthDashboard,
    });
  }, [
    portfolio.batchSource,
    portfolio.evaluatedAtJa,
    portfolio.portfolioScore,
    portfolio.holdingCount,
    bundle,
    urgency?.allSignals.length,
    apiHealthDashboard,
  ]);

  if (isLite) {
    return (
      <View style={styles.wrap} testID="concierge-ai-action-center-lite">
        {isMockData ? (
          <View style={styles.mockBanner}>
            <Text style={styles.mockBannerText}>⚠ MOCK DATA</Text>
          </View>
        ) : null}
        <Text style={styles.title}>{STRATEGY_UI_LABELS_JA.panelTitle} (Lite)</Text>
        <PortfolioScoreBlock
          portfolioScore={portfolio.portfolioScore}
          holdingCount={activeHoldingCount}
          scoreColor={scoreColor}
          batchSource={portfolio.batchSource || MISSING_JA}
        />
        <AiAnalystReportPanel report={analystReport} />
        {!showCandidateRanking && dailyComment.sections.some((s) => s.kind !== 'daily_comment') ? (
          <AiDailyCommentPanel
            comment={{
              ...dailyComment,
              sections: dailyComment.sections.filter((s) => s.kind !== 'daily_comment'),
              todaySummaryJa: '',
              headlineJa: '',
              topProfitLines: [],
              cautionLines: [],
              recommendedActions: [],
            }}
          />
        ) : null}
        {showCandidateRanking ? <AiDailyCommentPanel comment={dailyComment} /> : null}
        <View style={styles.section} testID="portfolio-ai-score-breakdown">
          <Text style={styles.sectionTitle}>Portfolio Score 内訳</Text>
          <SelectableText style={styles.liteEvalLine}>
            利益率: {scoreBreakdown.profitability >= 0 ? '+' : ''}
            {scoreBreakdown.profitability}
          </SelectableText>
          <SelectableText style={styles.liteEvalLine}>
            RSI: {scoreBreakdown.rsi >= 0 ? '+' : ''}
            {scoreBreakdown.rsi}
          </SelectableText>
          <SelectableText style={styles.liteEvalLine}>
            ニュース: {scoreBreakdown.news >= 0 ? '+' : ''}
            {scoreBreakdown.news}
          </SelectableText>
          <SelectableText style={styles.liteEvalLine}>
            集中リスク: {scoreBreakdown.concentrationRisk}
          </SelectableText>
          <SelectableText style={styles.liteEvalLine}>合計: {scoreBreakdown.total}</SelectableText>
        </View>
        {showCandidateRanking ? (
          <>
            <LiteCandidateBlock title="推奨買い候補" items={candidates.buyCandidates} />
            <LiteCandidateBlock title="推奨売り候補" items={candidates.sellCandidates} />
          </>
        ) : null}
        <RealDataPipelineTable bundle={bundle} portfolio={portfolio} apiHealth={apiHealthDashboard} />
        <View style={styles.section} testID="portfolio-ai-lite-evaluations">
          <Text style={styles.sectionTitle}>
            {showCandidateRanking
              ? `評価サマリー（上位 ${liteEvalItems.length || 0} 銘柄）`
              : `保有銘柄評価（${liteEvalItems.length || 0} 銘柄）`}
          </Text>
          {liteEvalItems.length === 0 ? (
            <SelectableText style={styles.emptyLine}>{MISSING_JA}</SelectableText>
          ) : (
            liteEvalItems.map((item, index) => (
              <AiActionCenterLiteEvalRow
                key={evalRowReactKey('lite-eval', item, index)}
                item={item}
                bundle={bundle}
                batchSource={portfolio.batchSource}
                index={index}
              />
            ))
          )}
        </View>
        <AiActionCenterApiVerification bundle={bundle} batchSource={portfolio.batchSource || MISSING_JA} />
        <AiActionCenterConnectionTest />
        <SelectableText style={styles.devFooter} testID="portfolio-ai-eval-ui-version">
          {PORTFOLIO_AI_EVAL_UI_VERSION} · lite
        </SelectableText>
      </View>
    );
  }

  const rankingKeys = (showCandidateRanking ? portfolio.rankedHoldings : holdingRanked).map(
    (item, index) => evalRowReactKey('portfolio-ai-ranking', item, index),
  );
  logDuplicateReactKeys('AiActionCenter/ranking', 'PortfolioEvalRow', rankingKeys);

  return (
    <View style={styles.wrap} testID="concierge-ai-action-center">
      {isMockData ? (
        <View style={styles.mockBanner}>
          <Text style={styles.mockBannerText}>⚠ MOCK DATA</Text>
        </View>
      ) : null}
      <Text style={styles.title}>{STRATEGY_UI_LABELS_JA.panelTitle}</Text>

      <PortfolioScoreBlock
        portfolioScore={portfolio.portfolioScore}
        holdingCount={activeHoldingCount}
        scoreColor={scoreColor}
        batchSource={portfolio.batchSource || MISSING_JA}
      />

      <AiAnalystReportPanel report={analystReport} />
      {!showCandidateRanking && dailyComment.sections.some((s) => s.kind !== 'daily_comment') ? (
        <AiDailyCommentPanel
          comment={{
            ...dailyComment,
            sections: dailyComment.sections.filter((s) => s.kind !== 'daily_comment'),
            todaySummaryJa: '',
            headlineJa: '',
            topProfitLines: [],
            cautionLines: [],
            recommendedActions: [],
          }}
        />
      ) : null}
      {showCandidateRanking ? <AiDailyCommentPanel comment={dailyComment} /> : null}

      <SelectableText style={styles.meta}>
        戦術 {TACTICAL_MODE_LABELS_JA[bundle.tacticalMode]} · {bundle.regimeStrategyJa}
      </SelectableText>

      <SelectableText style={styles.updatedAt} testID="portfolio-ai-evaluated-at">
        {STRATEGY_UI_LABELS_JA.evaluatedAt}: {portfolio.evaluatedAtJa || MISSING_JA} · ソース:{' '}
        {portfolio.batchSource || MISSING_JA}
      </SelectableText>

      {showCandidateRanking ? (
        <>
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
        </>
      ) : null}

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
        <Text style={styles.sectionTitle}>
          {showCandidateRanking ? STRATEGY_UI_LABELS_JA.ranking : '保有銘柄評価'}
        </Text>
        {(showCandidateRanking ? portfolio.rankedHoldings : holdingRanked).length === 0 ? (
          <SelectableText style={styles.emptyLine}>{MISSING_JA}</SelectableText>
        ) : (
          (showCandidateRanking ? portfolio.rankedHoldings : holdingRanked).map((item, index) => (
            <PortfolioEvalRow
              key={rankingKeys[index]}
              item={item}
              sectionId="portfolio-ai-ranking"
              rowIndex={index}
            />
          ))
        )}
      </View>

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
          {bundle.todayRecommendations.map((r, index) => (
            <SelectableText key={`today-rec-idx${index}-${r.symbol}`} style={styles.rankLine}>
              {r.displayLabelJa} — {STRATEGY_ACTION_LABELS_JA[r.action]} ({r.confidencePct}%)
            </SelectableText>
          ))}
        </View>
      ) : null}

      {typeof __DEV__ !== 'undefined' && __DEV__ ? (
        <SelectableText style={styles.devFooter} testID="portfolio-ai-eval-ui-version">
          {PORTFOLIO_AI_EVAL_UI_VERSION}
          {bundle.portfolioAiEvaluation ? '' : ' · fallback from strategyBundle'}
        </SelectableText>
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
  scoreLabelEn: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: 4,
    opacity: 0.9,
  },
  scoreValue: { fontSize: 40, fontWeight: '800', lineHeight: 48 },
  scoreSub: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm },
  batchSourceLine: {
    color: theme.colors.success,
    fontSize: theme.fontSize.sm,
    fontWeight: '600',
    marginTop: 6,
    textAlign: 'center',
  },
  liteEvalRow: {
    marginBottom: 10,
    padding: theme.spacing.xs,
    borderRadius: theme.radius.sm,
    backgroundColor: 'rgba(59, 130, 246, 0.06)',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  liteEvalTitle: { fontWeight: '700', fontSize: theme.fontSize.sm, color: theme.colors.text, marginBottom: 4 },
  liteEvalLine: { fontSize: theme.fontSize.sm, color: theme.colors.textMuted, lineHeight: 18, marginBottom: 2 },
  pipelineRow: { flexDirection: 'row', gap: 8, marginBottom: 8, alignItems: 'flex-start' },
  pipelineStatus: { fontSize: 10, fontWeight: '800', width: 56, marginTop: 2 },
  pipelineTextCol: { flex: 1 },
  pipelineLayer: { fontSize: theme.fontSize.sm, fontWeight: '600', color: theme.colors.text },
  pipelineDetail: { fontSize: 11, color: theme.colors.textMuted, lineHeight: 16, marginTop: 2 },
  mockWarn: { color: theme.colors.danger, fontSize: theme.fontSize.sm, marginTop: 6 },
  mockBanner: {
    backgroundColor: 'rgba(239, 68, 68, 0.16)',
    borderColor: theme.colors.danger,
    borderWidth: 1,
    borderRadius: theme.radius.sm,
    paddingVertical: 6,
    paddingHorizontal: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  mockBannerText: { color: theme.colors.danger, fontWeight: '800', fontSize: theme.fontSize.sm },
  updatedAt: {
    color: theme.colors.textMuted,
    fontSize: theme.fontSize.sm,
    marginBottom: theme.spacing.sm,
  },
  emptyLine: { color: theme.colors.textMuted, fontSize: theme.fontSize.sm, lineHeight: 20 },
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
  devFooter: {
    color: theme.colors.textMuted,
    fontSize: 10,
    marginTop: theme.spacing.sm,
    opacity: 0.85,
  },
});
