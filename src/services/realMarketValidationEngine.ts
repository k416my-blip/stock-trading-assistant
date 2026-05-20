import type { RealQuantValidationReport } from '../types/quantValidation';
import { loadNormalizedOHLCVDataset } from './normalizedMarketData';
import { runQuantValidationSuite } from './quantValidationEngine';

/** 実市場データに基づくクオンツ検証（キャッシュ済み OHLCV のみ — API は呼ばない） */
export async function runRealMarketValidation(options?: {
  maxSymbols?: number;
}): Promise<RealQuantValidationReport> {
  const { dataset, dataSource } = await loadNormalizedOHLCVDataset(options);
  const suite = runQuantValidationSuite(dataset);

  const tradingDays = dataset.alignedDates.length || dataset.series[0]?.bars.length || 0;

  const robust =
    suite.psychologicalStress.stressScore < 70 &&
    suite.regimeInstability.instabilityRatio < 1.8 &&
    suite.monteCarlo.probLossPct < 55 &&
    suite.gapRisk.maxGapPct < 8;

  const verdict = robust
    ? '実データ検証: 市場カオス下でも資本保全ルールは比較的ロバスト（サバイバーシップ制約付き）'
    : '実データ検証: 高ボラ・ギャップ・心理ストレス下で脆弱性あり — エクスポージャーと執行遅延の見直しを推奨';

  return {
    computedAt: new Date().toISOString(),
    dataSource,
    symbolsLoaded: dataset.series.length,
    tradingDays,
    survivorship: dataset.survivorship,
    ...suite,
    robustUnderChaos: robust,
    verdictJa: verdict,
  };
}
