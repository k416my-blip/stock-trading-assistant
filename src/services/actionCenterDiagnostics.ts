/**
 * AI Action Center — Metro 診断ログ・実データパイプライン一覧
 */
import { AI_ACTION_CENTER_LITE_SKIP_HYBRID } from '../constants/aiConciergeDevFlags';
import { ACTION_CENTER_LOGS } from '../utils/devLog';
import { buildLiteTradeCandidates } from './actionCenterInsights';
import {
  isHybridPipelineActive,
  rawHybridSource,
  resolveActionCenterProviderStatuses,
  type ProviderDisplayStatus,
} from './actionCenterProviderStatus';
import { formatDataSourcesLine } from './portfolioAiEvaluationDisplay';
import type { ApiHealthDashboard } from '../types/apiSetup';
import type { PortfolioAiEvaluationBundle, PortfolioAiSymbolEvaluation } from '../types/portfolioAiEvaluation';
import type { StrategyExecutionBundle } from '../types/strategyExecution';
import type { UrgencySignal } from '../types/urgencySignal';

export type RealDataPipelineRow = {
  layer: string;
  status: 'real' | 'partial' | 'mock' | 'skipped';
  detailJa: string;
};

export type ActionCenterMetroLogInput = {
  bundle: StrategyExecutionBundle;
  portfolio: PortfolioAiEvaluationBundle;
  signalCount?: number;
  hybridSkipped?: boolean;
  apiHealth?: ApiHealthDashboard | null;
  twelveManualOk?: boolean | null;
  newsManualOk?: boolean | null;
};

export type NoActiveSignalLogInput = {
  allSignalsCount: number;
  queueItemsCount: number;
  activeQueueSignals: number;
  staleHoldingsCount: number;
  degradedMode: boolean;
  diagnosticsCritical: number;
  diagnosticsError: number;
  executionBlocked: boolean;
  reasonsJa: string[];
};

function rawHybridSourceFromBundle(bundle: StrategyExecutionBundle): string {
  return rawHybridSource(bundle);
}

export function isMockFallbackSource(bundle: StrategyExecutionBundle, portfolio: PortfolioAiEvaluationBundle): boolean {
  const raw = rawHybridSourceFromBundle(bundle);
  return raw === 'mock_fallback' || portfolio.batchSource === 'mock_fallback';
}

export function resolveSymbolProvider(
  item: PortfolioAiSymbolEvaluation,
  batchSource: string,
): string {
  const parts = formatDataSourcesLine(item.dataSources);
  if (parts !== '未取得') return parts;
  return batchSource || '未取得';
}

export function resolveAnalysisSummary(
  item: PortfolioAiSymbolEvaluation,
  bundle: StrategyExecutionBundle,
): string {
  const recs = [
    ...bundle.todayRecommendations,
    ...bundle.dangerAvoid,
    ...bundle.watchList,
    ...bundle.highExpectancy,
  ];
  const rec = recs.find((r) => r.symbol.toUpperCase() === item.symbol.toUpperCase());
  const hybridRationale = rec?.hybrid?.rationaleJa?.trim();
  if (hybridRationale) return hybridRationale;
  if (rec?.whyProposedJa?.trim()) return rec.whyProposedJa.trim();
  return item.rationaleJa?.trim() || '未取得';
}

function statusFromProvider(p: ProviderDisplayStatus): RealDataPipelineRow['status'] {
  if (p.code === 'executed') return 'real';
  if (p.code === 'failed') return 'mock';
  if (p.code === 'skipped') return 'skipped';
  return 'partial';
}

export function buildRealDataPipelineReport(
  bundle: StrategyExecutionBundle,
  portfolio: PortfolioAiEvaluationBundle,
  apiHealth?: ApiHealthDashboard | null,
): RealDataPipelineRow[] {
  const raw = rawHybridSourceFromBundle(bundle);
  const batch = portfolio.batchSource;
  const ranked = portfolio.rankedHoldings;
  const providers = resolveActionCenterProviderStatuses({
    bundle,
    batchSource: batch,
    apiHealth,
  });

  const withYahooRsi = ranked.filter(
    (r) => r.rsiSource === 'yahoo_finance' || r.rsiSource === 'bursa_malaysia',
  ).length;
  const withLocalRsi = ranked.filter(
    (r) => r.rsiSource === 'local_price_history' || !r.rsiSource,
  ).length;

  const hybrid = isHybridPipelineActive(batch, raw);

  return [
    {
      layer: 'Twelve Data（株価）',
      status: statusFromProvider(providers.twelve),
      detailJa: hybrid
        ? `実行済み — ${providers.twelve.detailJa}`
        : providers.twelve.detailJa,
    },
    {
      layer: 'NewsAPI（ニュース）',
      status: statusFromProvider(providers.news),
      detailJa: hybrid
        ? `実行済み — ${providers.news.detailJa}`
        : providers.news.detailJa,
    },
    {
      layer: 'OpenAI（AI 第二評価）',
      status: statusFromProvider(providers.openAi),
      detailJa: providers.openAi.detailJa,
    },
    {
      layer: 'RSI（テクニカル）',
      status:
        withYahooRsi > 0
          ? withLocalRsi > 0
            ? 'partial'
            : 'real'
          : withLocalRsi > 0
            ? 'mock'
            : hybrid
              ? 'partial'
              : 'skipped',
      detailJa:
        withYahooRsi > 0
          ? `Yahoo/Bursa RSI ${withYahooRsi}銘柄` +
            (withLocalRsi > 0 ? ` · ローカル ${withLocalRsi}銘柄` : '')
          : hybrid
            ? 'hybrid 実行 — RSI は Yahoo/ローカル混在'
            : 'RSI 未取得',
    },
  ];
}

let lastActionCenterMetroKey = '';

export function logActionCenterMetro(input: ActionCenterMetroLogInput): void {
  if (typeof __DEV__ !== 'undefined' && !__DEV__ && !ACTION_CENTER_LOGS) return;

  const dedupeKey = [
    input.portfolio.batchSource,
    input.portfolio.evaluatedAtJa,
    input.portfolio.portfolioScore,
    input.portfolio.holdingCount,
    input.signalCount ?? '',
    input.bundle.hybridSecondEvaluator?.source ?? '',
  ].join('|');
  if (dedupeKey === lastActionCenterMetroKey) return;
  lastActionCenterMetroKey = dedupeKey;

  const raw = rawHybridSourceFromBundle(input.bundle);
  const mock = isMockFallbackSource(input.bundle, input.portfolio);
  const providerStatuses = resolveActionCenterProviderStatuses({
    bundle: input.bundle,
    batchSource: input.portfolio.batchSource,
    apiHealth: input.apiHealth,
    twelveManualOk: input.twelveManualOk,
    newsManualOk: input.newsManualOk,
  });
  const candidates = buildLiteTradeCandidates({ portfolio: input.portfolio, bundle: input.bundle });
  const payload = {
    source: input.portfolio.batchSource,
    portfolioScore: input.portfolio.portfolioScore,
    holdingCount: input.portfolio.holdingCount,
    rankedCount: input.portfolio.rankedHoldings.length,
    signalCount: input.signalCount ?? null,
    twelveDataStatus: providerStatuses.twelveDataStatus,
    newsApiStatus: providerStatuses.newsApiStatus,
    openAiStatus: providerStatuses.openAiStatus,
    buyCandidates: candidates.buyCandidates,
    sellCandidates: candidates.sellCandidates,
    topReason: candidates.topReason,
    rawHybridSource: raw,
    mockFallback: mock,
    hybridSkipped: input.hybridSkipped ?? AI_ACTION_CENTER_LITE_SKIP_HYBRID,
    pipeline: buildRealDataPipelineReport(input.bundle, input.portfolio, input.apiHealth),
  };
  console.warn('[ACTION_CENTER]', JSON.stringify(payload));
  if (mock) {
    console.warn(
      '[ACTION_CENTER] mock_fallback detected — display source:',
      input.portfolio.batchSource,
    );
  }
}

let lastNoActiveSignalKey = '';

export function logNoActiveSignalReason(input: NoActiveSignalLogInput): void {
  if (!ACTION_CENTER_LOGS) return;

  const dedupeKey = [
    input.allSignalsCount,
    input.queueItemsCount,
    input.activeQueueSignals,
    input.staleHoldingsCount,
    input.degradedMode,
    input.diagnosticsCritical,
    input.diagnosticsError,
    input.executionBlocked,
  ].join('|');
  if (dedupeKey === lastNoActiveSignalKey) return;
  lastNoActiveSignalKey = dedupeKey;

  console.warn(
    '[ACTION_CENTER/no_signal]',
    JSON.stringify({
      message: '現在重要シグナルなし',
      allSignalsCount: input.allSignalsCount,
      queueItemsCount: input.queueItemsCount,
      activeQueueSignals: input.activeQueueSignals,
      staleHoldingsCount: input.staleHoldingsCount,
      degradedMode: input.degradedMode,
      diagnosticsCritical: input.diagnosticsCritical,
      diagnosticsError: input.diagnosticsError,
      executionBlocked: input.executionBlocked,
      reasonsJa: input.reasonsJa,
    }),
  );
}

export function buildNoActiveSignalReasons(input: NoActiveSignalLogInput): string[] {
  if (input.allSignalsCount > 0) {
    return [`集約シグナル ${input.allSignalsCount} 件あるが表示優先度でヘッダー非表示（要 pickActiveUrgencySignal 確認）`];
  }
  const reasons: string[] = [];
  if (input.queueItemsCount === 0) reasons.push('AI トレードキューが空');
  else if (input.activeQueueSignals === 0) {
    reasons.push(`キュー ${input.queueItemsCount} 件 — すべて確認済み/期限切れ`);
  }
  if (input.staleHoldingsCount === 0) reasons.push('古い株価シグナル条件未満');
  if (!input.degradedMode) reasons.push('劣化モードシグナルなし');
  if (input.diagnosticsCritical === 0 && input.diagnosticsError === 0) {
    reasons.push('重大/エラー診断なし');
  }
  if (!input.executionBlocked) reasons.push('執行ブロックシグナルなし');
  if (reasons.length === 0) reasons.push('アクティブな緊急条件に該当なし');
  return reasons;
}

export function summarizeSignalsForLog(signals: UrgencySignal[]): {
  signalCount: number;
  ids: string[];
} {
  return {
    signalCount: signals.length,
    ids: signals.slice(0, 5).map((s) => s.id),
  };
}
