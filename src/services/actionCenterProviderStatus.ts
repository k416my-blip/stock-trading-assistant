/**
 * Action Center — Twelve / News / OpenAI の実行状態（UI と Metro ログ共通）
 *
 * 参照元:
 * - analysisState: strategyBundle.hybridSecondEvaluator + portfolioAiEvaluation.batchSource
 * - apiHealth: AppContext.apiHealthDashboard（ウィザード openai/news のみ）
 * - providerStatus: AiActionCenterApiVerification の手動接続テスト結果
 */
import type { ApiHealthDashboard } from '../types/apiSetup';
import type { StrategyExecutionBundle } from '../types/strategyExecution';

export type ProviderStatusCode = 'executed' | 'idle' | 'failed' | 'skipped';

export type ProviderDisplayStatus = {
  code: ProviderStatusCode;
  labelJa: string;
  detailJa: string;
};

export function rawHybridSource(bundle: StrategyExecutionBundle): string {
  return bundle.hybridSecondEvaluator?.source ?? 'none';
}

export function isHybridPipelineActive(batchSource: string, rawHybrid: string): boolean {
  return (
    batchSource === 'hybrid' ||
    batchSource === 'twelve_data' ||
    batchSource === 'newsapi' ||
    rawHybrid === 'openai' ||
    rawHybrid === 'cache'
  );
}

function fromManualTest(ok: boolean | null | undefined, idleLabel: string): ProviderDisplayStatus | null {
  if (ok === true) {
    return { code: 'executed', labelJa: '実行済み', detailJa: '接続テスト成功' };
  }
  if (ok === false) {
    return { code: 'failed', labelJa: '接続失敗', detailJa: '接続テスト失敗' };
  }
  return null;
}

export function resolveTwelveDataDisplayStatus(input: {
  batchSource: string;
  rawHybridSource: string;
  manualTestOk?: boolean | null;
}): ProviderDisplayStatus {
  const manual = fromManualTest(input.manualTestOk, '未実行');
  if (manual) return manual;

  if (isHybridPipelineActive(input.batchSource, input.rawHybridSource)) {
    return {
      code: 'executed',
      labelJa: '実行済み',
      detailJa: 'hybrid enrichment で Twelve Data 経路を使用',
    };
  }

  if (input.batchSource === 'twelve_data') {
    return { code: 'executed', labelJa: '実行済み', detailJa: 'source=twelve_data' };
  }

  return { code: 'idle', labelJa: '未実行', detailJa: 'hybrid 未実行 · 接続テスト未実施' };
}

export function resolveNewsApiDisplayStatus(input: {
  batchSource: string;
  rawHybridSource: string;
  manualTestOk?: boolean | null;
  apiHealth?: ApiHealthDashboard | null;
}): ProviderDisplayStatus {
  const manual = fromManualTest(input.manualTestOk, '未実行');
  if (manual) return manual;

  if (isHybridPipelineActive(input.batchSource, input.rawHybridSource)) {
    return {
      code: 'executed',
      labelJa: '実行済み',
      detailJa: 'hybrid enrichment で NewsAPI 統合ニュースを取得',
    };
  }

  const newsHealth = input.apiHealth?.providers.news;
  if (newsHealth?.status === 'ok') {
    return { code: 'executed', labelJa: '実行済み', detailJa: newsHealth.messageJa };
  }
  if (newsHealth?.status === 'error') {
    return { code: 'failed', labelJa: '接続失敗', detailJa: newsHealth.messageJa };
  }

  if (input.batchSource === 'newsapi') {
    return { code: 'executed', labelJa: '実行済み', detailJa: 'source=newsapi' };
  }

  return { code: 'idle', labelJa: '未実行', detailJa: 'hybrid 未実行 · 接続テスト未実施' };
}

export function resolveOpenAiDisplayStatus(input: {
  batchSource: string;
  rawHybridSource: string;
  apiHealth?: ApiHealthDashboard | null;
}): ProviderDisplayStatus {
  const raw = input.rawHybridSource;
  const hybrid = isHybridPipelineActive(input.batchSource, raw);

  if (hybrid && raw !== 'mock_fallback' && raw !== 'skipped' && raw !== 'none') {
    return {
      code: 'executed',
      labelJa: '実行済み',
      detailJa: `OpenAI 第二評価 · raw=${raw}`,
    };
  }

  const openAiHealth = input.apiHealth?.providers.openai;
  if (openAiHealth?.status === 'ok') {
    return { code: 'executed', labelJa: '実行済み', detailJa: openAiHealth.messageJa };
  }
  if (raw === 'mock_fallback') {
    return { code: 'failed', labelJa: 'モック', detailJa: 'mock_fallback' };
  }
  if (raw === 'skipped' || raw === 'none') {
    return { code: 'skipped', labelJa: '未実行', detailJa: 'hybrid スキップ' };
  }

  return { code: 'idle', labelJa: '未実行', detailJa: 'OpenAI 評価未実行' };
}

export function resolveActionCenterProviderStatuses(input: {
  bundle: StrategyExecutionBundle;
  batchSource: string;
  apiHealth?: ApiHealthDashboard | null;
  twelveManualOk?: boolean | null;
  newsManualOk?: boolean | null;
}): {
  twelveDataStatus: string;
  newsApiStatus: string;
  openAiStatus: string;
  twelve: ProviderDisplayStatus;
  news: ProviderDisplayStatus;
  openAi: ProviderDisplayStatus;
} {
  const raw = rawHybridSource(input.bundle);
  const twelve = resolveTwelveDataDisplayStatus({
    batchSource: input.batchSource,
    rawHybridSource: raw,
    manualTestOk: input.twelveManualOk,
  });
  const news = resolveNewsApiDisplayStatus({
    batchSource: input.batchSource,
    rawHybridSource: raw,
    manualTestOk: input.newsManualOk,
    apiHealth: input.apiHealth,
  });
  const openAi = resolveOpenAiDisplayStatus({
    batchSource: input.batchSource,
    rawHybridSource: raw,
    apiHealth: input.apiHealth,
  });
  return {
    twelveDataStatus: twelve.labelJa,
    newsApiStatus: news.labelJa,
    openAiStatus: openAi.labelJa,
    twelve,
    news,
    openAi,
  };
}
