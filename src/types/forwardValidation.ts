import type { ForwardEtfSymbol } from '../constants/forwardValidation';
import type { FourBucket, Regime } from '../services/forwardValidation/case4Indicators';

export type ForwardSignalRecord = {
  id: string;
  date: string;
  symbol: ForwardEtfSymbol;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: string;
  entryPrice: number | null;
  entryDate: string | null;
  status: 'pending_entry' | 'open' | 'closed' | 'skipped';
  createdAt: string;
};

export type ForwardOpenPosition = {
  id: string;
  signalId: string;
  signalDate: string;
  symbol: ForwardEtfSymbol;
  entryDate: string;
  entryPrice: number;
  weight: number;
  adx14: number;
  macdHistPct: number;
  barsHeld: number;
};

export type ForwardClosedTrade = {
  id: string;
  signalId: string;
  signalDate: string;
  exitDate: string;
  symbol: ForwardEtfSymbol;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  weight: number;
  exitReason: 'take_profit' | 'max_hold';
  adx14: number;
  macdHistPct: number;
};

export type ForwardDailyReturn = {
  date: string;
  returnPct: number;
  tradeIds: string[];
};

export type ForwardPerformanceMetrics = {
  tradeCount: number;
  closedTradeCount: number;
  openPositionCount: number;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  winRate: number | null;
  totalReturnPct: number | null;
  equityUsd: number;
};

export type ForwardBaselineComparison = {
  backtest: {
    sharpe: number;
    maxDrawdownPct: number;
    profitFactor: number;
    winRate: number;
    totalReturnPct: number;
  };
  forward: ForwardPerformanceMetrics;
  delta: {
    sharpe: number | null;
    maxDrawdownPct: number | null;
    profitFactor: number | null;
    winRate: number | null;
    totalReturnPct: number | null;
  };
};

export type ForwardValidationReport = {
  generatedAt: string;
  triggerTradeCount: number;
  metrics: ForwardPerformanceMetrics;
  baselineComparison: ForwardBaselineComparison;
  summaryJa: string;
};

export type ForwardYahooSymbolFetchResult = {
  symbol: string;
  ok: boolean;
  barCount: number;
  latestDate: string | null;
  httpStatus: number | null;
  error: string | null;
};

export type ForwardYahooFetchLog = {
  fetchedAt: string;
  successCount: number;
  failureCount: number;
  symbols: ForwardYahooSymbolFetchResult[];
};

export type ForwardPositionView = {
  symbol: ForwardEtfSymbol;
  entryDate: string;
  entryPrice: number;
  currentPrice: number;
  priceAsOfDate: string;
  barsHeld: number;
  unrealizedPct: number;
  weight: number;
};

export type ForwardActiveSignalView = {
  symbol: ForwardEtfSymbol;
  signalDate: string;
  entryDate: string | null;
  entryPrice: number | null;
  currentPrice: number | null;
  priceAsOfDate: string | null;
  barsHeld: number;
  unrealizedPct: number | null;
  status: ForwardSignalRecord['status'];
};

export type ForwardOperationalSnapshot = {
  activeSignals: ForwardActiveSignalView[];
  nextJudgmentAt: string | null;
  nextJudgmentNoteJa: string;
  yahooSuccessCount: number;
  yahooFailureCount: number;
  yahooTotalCount: number;
  judgmentDate: string | null;
  newSignalCount: number;
  closeCount: number;
  holdingCount: number;
  equityStartUsd: number;
  equityCurrentUsd: number;
  cumulativeReturnPct: number | null;
  equityCurve: Array<{ date: string; equityUsd: number }>;
  isUpToDate: boolean;
};

export type ForwardValidationAuditFinding = {
  id: string;
  status: 'pass' | 'warn' | 'fail';
  labelJa: string;
  detailJa: string;
};

export type ForwardValidationAuditResult = {
  auditedAt: string;
  findings: ForwardValidationAuditFinding[];
  storageSummaryJa: string;
  allPassed: boolean;
};

export type ForwardEtfLatestDiagnosis = {
  symbol: ForwardEtfSymbol;
  barDate: string;
  adx14: number | null;
  macdHistPct: number | null;
  dist52wPct: number | null;
  spyRegime: Regime | 'unknown';
  spyRet63Pct: number | null;
  bucket: FourBucket | 'unknown';
  passes: boolean;
  disqualificationReasonsJa: string[];
  primaryDisqualificationJa: string;
};

export type ForwardSignalGapDaySummary = {
  date: string;
  passingSymbols: ForwardEtfSymbol[];
  rejectedByConcurrentLimit: ForwardEtfSymbol[];
  perSymbolPrimaryReasonJa: Record<ForwardEtfSymbol, string>;
};

export type ForwardSignalGapAuditReport = {
  auditedAt: string;
  sinceDate: string;
  yahooLatestDate: string;
  lastSignalDate: string | null;
  lastSignalSymbol: ForwardEtfSymbol | null;
  signalsSinceCount: number;
  tradingDaysSince: number;
  daysWithAnyPass: number;
  daysWithZeroPass: number;
  latestBarDiagnosis: ForwardEtfLatestDiagnosis[];
  gapPeriodSummaries: ForwardSignalGapDaySummary[];
  reasonCountsSince: Record<ForwardEtfSymbol, Record<string, number>>;
  activeSignalZeroReportJa: string;
  humanSummaryJa: string;
};

export type ForwardConditionBlockRankingItem = {
  rank: number;
  category: string;
  labelJa: string;
  count: number;
  ratePct: number;
  rateOfAllPct: number;
};

export type ForwardConditionBlockPeriodStats = {
  fromDate: string;
  toDate: string;
  tradingDays: number;
  totalEvaluations: number;
  passCount: number;
  failCount: number;
  counts: {
    passed: number;
    pullback: number;
    adx: number;
    macd: number;
    regime: number;
    other: number;
  };
  rates: {
    passedPct: number;
    pullbackPct: number;
    adxPct: number;
    macdPct: number;
    regimePct: number;
    otherPct: number;
  };
  ranking: ForwardConditionBlockRankingItem[];
  perEtfCounts: Record<
    ForwardEtfSymbol,
    {
      passed: number;
      pullback: number;
      adx: number;
      macd: number;
      regime: number;
      other: number;
    }
  >;
};

export type ForwardConditionBlockAuditReport = {
  auditedAt: string;
  fullPeriod: ForwardConditionBlockPeriodStats;
  gapPeriod: ForwardConditionBlockPeriodStats;
  humanSummaryJa: string;
};

export type ForwardAdxDistributionBucket = {
  label: string;
  count: number;
  pct: number;
};

export type ForwardAdxEtfStats = {
  symbol: ForwardEtfSymbol;
  evaluationCount: number;
  adxMeanAll: number | null;
  adxFailCount: number;
  adxFailMean: number | null;
  passedCount: number;
  passedMean: number | null;
};

export type ForwardAdxAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalEvaluations: number;
  adxAvailableCount: number;
  adxPrimaryFailCount: number;
  adxPrimaryFailMean: number | null;
  passedCount: number;
  passedMean: number | null;
  distribution: ForwardAdxDistributionBucket[];
  perEtf: ForwardAdxEtfStats[];
  humanSummaryJa: string;
};

export type ForwardMacdDistributionBucket = {
  label: string;
  count: number;
  pct: number;
};

export type ForwardMacdEtfStats = {
  symbol: ForwardEtfSymbol;
  evaluationCount: number;
  macdMeanAll: number | null;
  macdFailCount: number;
  macdFailMean: number | null;
  passedCount: number;
  passedMean: number | null;
  adxPassThenMacdFailCount: number;
};

export type ForwardMacdAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalEvaluations: number;
  macdAvailableCount: number;
  macdPrimaryFailCount: number;
  macdPrimaryFailMean: number | null;
  passedCount: number;
  passedMean: number | null;
  adxPassThenMacdFailCount: number;
  distribution: ForwardMacdDistributionBucket[];
  perEtf: ForwardMacdEtfStats[];
  humanSummaryJa: string;
};

export type ForwardPassedTradeRecord = {
  id: string;
  symbol: ForwardEtfSymbol;
  signalDate: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  returnPct: number;
  holdDays: number;
  exitReason: 'take_profit' | 'max_hold';
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: string;
  spyRegime: string;
};

export type ForwardPassedTradeEtfStats = {
  symbol: ForwardEtfSymbol;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
};

export type ForwardPassedTradeTop20Insight = {
  etfCounts: Record<ForwardEtfSymbol, number>;
  dominantEtf: string | null;
  dominantBucket: string | null;
  dominantRegime: string | null;
  takeProfitCount: number;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
  avgHoldDays: number | null;
  avgReturnPct: number | null;
  summaryJa: string;
};

export type ForwardPassedTradeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  trades: ForwardPassedTradeRecord[];
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  entryStats: { avgAdx: number | null; avgMacd: number | null; avgDist52: number | null };
  avgHoldDays: number | null;
  avgReturnPct: number | null;
  perEtf: ForwardPassedTradeEtfStats[];
  top20Winners: ForwardPassedTradeRecord[];
  top20Insight: ForwardPassedTradeTop20Insight;
  humanSummaryJa: string;
};

export type ForwardWinLossGroupStats = {
  count: number;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
  avgHoldDays: number | null;
  avgReturnPct: number | null;
};

export type ForwardWinLossComparison = {
  adxDelta: number | null;
  macdDelta: number | null;
  dist52Delta: number | null;
  holdDaysDelta: number | null;
  summaryJa: string;
};

export type ForwardWinLossAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  winCount: number;
  lossCount: number;
  winners: ForwardWinLossGroupStats;
  losers: ForwardWinLossGroupStats;
  lossTrades: ForwardPassedTradeRecord[];
  loserCommonTraitsJa: string;
  comparison: ForwardWinLossComparison;
  humanSummaryJa: string;
};

export type ForwardDist52BucketId =
  | 'm2_m4'
  | 'm4_m6'
  | 'm6_m8'
  | 'm8_m10'
  | 'm10_m12'
  | 'm12_plus';

export type ForwardDist52BucketStats = {
  id: ForwardDist52BucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
};

export type ForwardDist52AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  unclassifiedCount: number;
  buckets: ForwardDist52BucketStats[];
  humanSummaryJa: string;
};

export type ForwardAdxBucketId = 'a25_30' | 'a30_35' | 'a35_40' | 'a40_50' | 'a50_plus';

export type ForwardCrossTabCell = {
  adxBucketId: ForwardAdxBucketId;
  adxLabelJa: string;
  dist52BucketId: ForwardDist52BucketId;
  dist52LabelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardAdxDist52CrossAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  classifiedCount: number;
  unclassifiedCount: number;
  adxBuckets: { id: ForwardAdxBucketId; labelJa: string }[];
  dist52Buckets: { id: ForwardDist52BucketId; labelJa: string }[];
  cells: ForwardCrossTabCell[];
  humanSummaryJa: string;
};

export type ForwardRegimeGroupId = 'up' | 'down' | 'sideways' | 'sideways_shallow';

export type ForwardRegimePerformanceStats = {
  id: ForwardRegimeGroupId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
};

export type ForwardRegimePerformanceAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  unclassifiedCount: number;
  groups: ForwardRegimePerformanceStats[];
  humanSummaryJa: string;
};

export type ForwardRegimeDist52CrossCell = {
  regimeGroupId: ForwardRegimeGroupId;
  regimeLabelJa: string;
  dist52BucketId: ForwardDist52BucketId;
  dist52LabelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  takeProfitRatePct: number;
  maxHoldRatePct: number;
};

export type ForwardRegimeDist52CrossAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  classifiedCount: number;
  unclassifiedCount: number;
  minCellTrades: number;
  regimeRows: { id: ForwardRegimeGroupId; labelJa: string }[];
  dist52Columns: { id: ForwardDist52BucketId; labelJa: string }[];
  cells: ForwardRegimeDist52CrossCell[];
  displayCells: ForwardRegimeDist52CrossCell[];
  humanSummaryJa: string;
};

export type ForwardReturnCorrelationMetricId = 'adx' | 'macd' | 'dist52';

export type ForwardReturnCorrelationMetricAudit = {
  id: ForwardReturnCorrelationMetricId;
  labelJa: string;
  correlation: number | null;
  top20Avg: number | null;
  bottom20Avg: number | null;
  top20Median: number | null;
  bottom20Median: number | null;
  allMedian: number | null;
  medianGapTopMinusBottom: number | null;
};

export type ForwardReturnCorrelationRanking = {
  rank: number;
  metricId: ForwardReturnCorrelationMetricId;
  labelJa: string;
  correlation: number | null;
  absCorrelation: number | null;
};

export type ForwardReturnCorrelationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  metrics: ForwardReturnCorrelationMetricAudit[];
  impactRanking: ForwardReturnCorrelationRanking[];
  humanSummaryJa: string;
};

export type ForwardMacdBucketId = 'm01_02' | 'm02_03' | 'm03_05' | 'm05_plus';

export type ForwardFourFactorComboCell = {
  regimeId: ForwardRegimeGroupId;
  regimeLabelJa: string;
  adxBucketId: ForwardAdxBucketId;
  adxLabelJa: string;
  macdBucketId: ForwardMacdBucketId;
  macdLabelJa: string;
  dist52BucketId: ForwardDist52BucketId;
  dist52LabelJa: string;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardFourFactorComboAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  unclassifiedCount: number;
  minCellTrades: number;
  cellsMinCount: ForwardFourFactorComboCell[];
  top10ByReturn: ForwardFourFactorComboCell[];
  spotlightDownAdx35MacdPosDist10: ForwardFourFactorComboCell;
  humanSummaryJa: string;
};

export type ForwardStrongCellScenarioId =
  | 'down_dist10'
  | 'down_dist8'
  | 'down_dist8_adx35'
  | 'down_dist8_adx35_macd';

export type ForwardStrongCellPeriodStats = {
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardStrongCellReproDiff = {
  tradeCount: number;
  winRatePct: number | null;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardStrongCellReproRow = {
  scenarioId: ForwardStrongCellScenarioId;
  labelJa: string;
  train: ForwardStrongCellPeriodStats;
  validation: ForwardStrongCellPeriodStats;
  diff: ForwardStrongCellReproDiff;
};

export type ForwardStrongCellReproAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  trainFrom: string;
  trainTo: string;
  validFrom: string;
  validTo: string;
  totalTrades: number;
  trainPoolCount: number;
  validPoolCount: number;
  rows: ForwardStrongCellReproRow[];
  humanSummaryJa: string;
};

export type ForwardSpyDownClusterMonthStats = {
  yearMonth: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
};

export type ForwardSpyDownGroupComparison = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
  etfCompositionPct: Record<ForwardEtfSymbol, number>;
  monthly: ForwardSpyDownClusterMonthStats[];
};

export type ForwardSpyDownClusterAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  spyDown: ForwardSpyDownGroupComparison;
  other: ForwardSpyDownGroupComparison;
  clusterMonths: ForwardSpyDownGroupComparison[];
  humanSummaryJa: string;
};

export type ForwardAprilExcludeSnapshot = {
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardAprilExcludeCompareRow = {
  label: string;
  before: ForwardAprilExcludeSnapshot;
  after: ForwardAprilExcludeSnapshot;
};

export type ForwardApril2025ExcludeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  excludeMonth: string;
  excludedCount: number;
  totalTrades: number;
  remainingCount: number;
  overall: ForwardAprilExcludeCompareRow;
  regimeRows: ForwardAprilExcludeCompareRow[];
  adxRows: ForwardAprilExcludeCompareRow[];
  dist52Rows: ForwardAprilExcludeCompareRow[];
  fourFactorRows: ForwardAprilExcludeCompareRow[];
  humanSummaryJa: string;
};

export type ForwardLoserTradeRow = {
  id: string;
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  exitReason: string;
  spyRegimeLabel: string;
  spyRegimeRaw: string;
  bucket: string;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
};

export type ForwardLoserGroupAverages = {
  returnPct: number | null;
  holdDays: number | null;
  spyDownPct: number;
  spyShallowDistPct: number;
  adx: number | null;
  macd: number | null;
  dist52: number | null;
};

export type ForwardLoserCompleteDiff = {
  returnPct: number | null;
  holdDays: number | null;
  spyDownPct: number | null;
  spyShallowDistPct: number | null;
  adx: number | null;
  macd: number | null;
  dist52: number | null;
};

export type ForwardLoserCompleteAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  loserRows: ForwardLoserTradeRow[];
  winAvg: ForwardLoserGroupAverages;
  lossAvg: ForwardLoserGroupAverages;
  diff: ForwardLoserCompleteDiff;
  humanSummaryJa: string;
};

export type ForwardLoserFeatureMetricId =
  | 'spy'
  | 'adx'
  | 'macd'
  | 'dist52'
  | 'etf'
  | 'holdDays'
  | 'weekday'
  | 'month'
  | 'volatility';

export type ForwardLoserEnrichedRow = {
  id: string;
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  exitReason: string;
  spyRegimeLabel: string;
  bucket: string;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  weekdayJa: string;
  monthKey: string;
  atrPct: number | null;
  atrRatio: number | null;
  realizedVol20Pct: number | null;
};

export type ForwardLoserFeatureCompareRow = {
  metricId: ForwardLoserFeatureMetricId;
  labelJa: string;
  winSummaryJa: string;
  lossSummaryJa: string;
  deltaJa: string;
  effectSize: number | null;
};

export type ForwardLoserFeatureAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  loserRows: ForwardLoserEnrichedRow[];
  compareRows: ForwardLoserFeatureCompareRow[];
  loserCommonTraitsJa: string;
  topDiscriminatorsJa: string;
  humanSummaryJa: string;
};

export type ForwardMaxHoldGroupStats = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
  spyUpPct: number;
  spyDownPct: number;
  spySidewaysPct: number;
  spyShallowPct: number;
  etfCompositionPct: Record<ForwardEtfSymbol, number>;
};

export type ForwardMaxHoldDiff = {
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  avgAdx: number | null;
  avgMacd: number | null;
  avgDist52: number | null;
  spyUpPct: number | null;
  spyDownPct: number | null;
  spySidewaysPct: number | null;
  spyShallowPct: number | null;
};

export type ForwardMaxHoldAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  takeProfitTrades: ForwardPassedTradeRecord[];
  maxHoldTrades: ForwardPassedTradeRecord[];
  reached: ForwardMaxHoldGroupStats;
  notReached: ForwardMaxHoldGroupStats;
  diff: ForwardMaxHoldDiff;
  humanSummaryJa: string;
};

export type ForwardRegimeStandaloneStats = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  takeProfitRatePct: number;
  maxHoldRatePct: number;
  etfCounts: Record<ForwardEtfSymbol, number>;
  etfPct: Record<ForwardEtfSymbol, number>;
};

export type ForwardRegimeStandaloneAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  unclassifiedCount: number;
  groups: ForwardRegimeStandaloneStats[];
  humanSummaryJa: string;
};

export type ForwardDist52StandaloneStats = {
  id: ForwardDist52BucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
  takeProfitRatePct: number;
  maxHoldRatePct: number;
  etfCounts: Record<ForwardEtfSymbol, number>;
  etfPct: Record<ForwardEtfSymbol, number>;
};

export type ForwardDist52StandaloneAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  unclassifiedCount: number;
  buckets: ForwardDist52StandaloneStats[];
  humanSummaryJa: string;
};

export type ForwardDownDist10PeriodId = 'p2024_h1' | 'p2024h2_2025h1' | 'p2025h2_on';

export type ForwardDownDist10PeriodStats = {
  id: ForwardDownDist10PeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  takeProfitRatePct: number;
  maxHoldRatePct: number;
};

export type ForwardDownDist10ReproAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  cohortLabelJa: string;
  matchedCount: number;
  periods: ForwardDownDist10PeriodStats[];
  humanSummaryJa: string;
};

export type ForwardDownDist10WalkForwardPeriodId = 'p2024_h2' | 'p2025_h1' | 'p2025_h2';

export type ForwardDownDist10WalkForwardPeriodStats = {
  id: ForwardDownDist10WalkForwardPeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  takeProfitRatePct: number;
};

export type ForwardDownDist10WalkForwardAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  cohortLabelJa: string;
  matchedCount: number;
  periods: ForwardDownDist10WalkForwardPeriodStats[];
  independenceInsightJa: string;
  humanSummaryJa: string;
};

export type ForwardAprilClusterHoldDaysBucketId = 'h1_7' | 'h8_14' | 'h15_21' | 'h22_25';

export type ForwardAprilClusterGroupStats = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  takeProfitRatePct: number;
  maxHoldRatePct: number;
};

export type ForwardAprilClusterFactorId = 'adx' | 'macd' | 'dist52' | 'etf' | 'holdDays';

export type ForwardAprilClusterFactorSection = {
  factorId: ForwardAprilClusterFactorId;
  factorLabelJa: string;
  groups: ForwardAprilClusterGroupStats[];
  returnSpreadPct: number | null;
  winRateSpreadPct: number | null;
};

export type ForwardApril2025ClusterExplainerAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  clusterMonth: string;
  clusterCount: number;
  overall: ForwardAprilClusterGroupStats;
  sections: ForwardAprilClusterFactorSection[];
  profitDriverInsightJa: string;
  humanSummaryJa: string;
};

export type ForwardTakeProfitScenarioId = 'tp3' | 'tp4' | 'tp5' | 'tp6';

export type ForwardTakeProfitScenarioStats = {
  id: ForwardTakeProfitScenarioId;
  takeProfitPct: number;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  takeProfitRatePct: number;
};

export type ForwardTakeProfitSensitivityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  baselineTakeProfitPct: number;
  scenarios: ForwardTakeProfitScenarioStats[];
  humanSummaryJa: string;
};

export type ForwardTrailingStopScenarioId =
  | 'fixed_tp5'
  | 'trail2'
  | 'trail3'
  | 'trail4';

export type ForwardTrailingStopScenarioStats = {
  id: ForwardTrailingStopScenarioId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  maxHoldRatePct: number;
  trailingStopRatePct: number;
  takeProfitRatePct: number;
};

export type ForwardTrailingStopAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  maxHoldDays: number;
  scenarios: ForwardTrailingStopScenarioStats[];
  humanSummaryJa: string;
};

export type ForwardConditionSplitId = 'macd' | 'dist52' | 'spy';

export type ForwardConditionSplitGroupStats = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardConditionSplitComparison = {
  id: ForwardConditionSplitId;
  labelJa: string;
  groupA: ForwardConditionSplitGroupStats;
  groupB: ForwardConditionSplitGroupStats;
};

export type ForwardConditionSplitAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  comparisons: ForwardConditionSplitComparison[];
  humanSummaryJa: string;
};

export type ForwardEightCellMacdSide = 'high' | 'low';
export type ForwardEightCellDistSide = 'deep' | 'shallow';
export type ForwardEightCellSpySide = 'down' | 'up_shallow';

export type ForwardEightCellStats = {
  macdSide: ForwardEightCellMacdSide;
  distSide: ForwardEightCellDistSide;
  spySide: ForwardEightCellSpySide;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardEightCellAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  classifiedCount: number;
  cells: ForwardEightCellStats[];
  humanSummaryJa: string;
};

export type ForwardStrongCellMonthlySnapshot = {
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardStrongCellMonthlyRow = ForwardStrongCellMonthlySnapshot & {
  month: string;
};

export type ForwardStrongCellMonthlyAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalPassedTrades: number;
  strongCellLabelJa: string;
  strongCellTradeCount: number;
  monthlyRows: ForwardStrongCellMonthlyRow[];
  fullPeriod: ForwardStrongCellMonthlySnapshot;
  aprilMonth: string;
  aprilClusterCount: number;
  aprilCluster: ForwardStrongCellMonthlySnapshot;
  excludingApril: ForwardStrongCellMonthlySnapshot;
  humanSummaryJa: string;
};

export type ForwardStrongCellFilterAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  totalWinners: number;
  totalLosers: number;
  strongCellLabelJa: string;
  excludedCount: number;
  excludedRatePct: number;
  excludedWinners: number;
  excludedLosers: number;
  remainingCount: number;
  remainingRatePct: number;
  remainingWinners: number;
  remainingLosers: number;
  baselineWinRatePct: number;
  newWinRatePct: number;
  baselineSharpe: number | null;
  newSharpe: number | null;
  humanSummaryJa: string;
};

export type ForwardStrongCellExclListingRow = {
  signalDate: string;
  entryDate: string;
  exitDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  macdHistPct: number;
  adx14: number;
  dist52wPct: number;
  exitReason: string;
};

export type ForwardStrongCellExclListingAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  strongCellLabelJa: string;
  strongCellTradeCount: number;
  excludeMonthsApplied: string[];
  excludeMonthsBothSpring: string[];
  excludedCount: number;
  excludedBothMonthsCount: number;
  excludedByMonth: Record<string, number>;
  remainingCount: number;
  rows: ForwardStrongCellExclListingRow[];
  humanSummaryJa: string;
};

export type ForwardStandalonePeriodFilterId = 'macd_high' | 'spy_down';
export type ForwardStandalonePeriodId = 'y2024' | 'y2025_h1' | 'y2025_h2';

export type ForwardStandalonePeriodCell = {
  filterId: ForwardStandalonePeriodFilterId;
  filterLabelJa: string;
  periodId: ForwardStandalonePeriodId;
  periodLabelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
};

export type ForwardStandalonePeriodAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  macdThreshold: number;
  cells: ForwardStandalonePeriodCell[];
  humanSummaryJa: string;
};

export type ForwardMacdDist52PeriodStats = {
  periodId: ForwardStandalonePeriodId;
  periodLabelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardMacdDist52PeriodAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  cohortTradeCount: number;
  macdThreshold: number;
  dist52Threshold: number;
  periods: ForwardMacdDist52PeriodStats[];
  humanSummaryJa: string;
};

export type ForwardMacdDist52EtfStats = {
  symbol: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardMacdDist52EtfAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  cohortTradeCount: number;
  macdThreshold: number;
  dist52Threshold: number;
  etfRows: ForwardMacdDist52EtfStats[];
  humanSummaryJa: string;
};

export type ForwardMacdDist52DedupDaySnapshot = {
  labelJa: string;
  dayCount: number;
  underlyingTradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardMacdDist52DedupDayBucket = {
  signalDate: string;
  tradeCount: number;
  symbols: string[];
  avgReturnPct: number;
  hasMaxHold: boolean;
};

export type ForwardMacdDist52DedupDayAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  cohortTradeCount: number;
  uniqueSignalDays: number;
  beforeDedup: ForwardMacdDist52DedupDaySnapshot;
  afterDedup: ForwardMacdDist52DedupDaySnapshot;
  dayBuckets: ForwardMacdDist52DedupDayBucket[];
  humanSummaryJa: string;
};

export type ForwardMacdDist52DedupTimelineRow = {
  index: number;
  signalDate: string;
  avgReturnPct: number;
  outcomeJa: string;
  etfCount: number;
  symbols: string[];
  cumulativeReturnPct: number;
  hasMaxHold: boolean;
};

export type ForwardMacdDist52DedupTimelineAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  underlyingTradeCount: number;
  eventCount: number;
  winCount: number;
  lossCount: number;
  maxConsecutiveLosses: number;
  maxDrawdownPct: number;
  finalCumulativeReturnPct: number;
  timeline: ForwardMacdDist52DedupTimelineRow[];
  humanSummaryJa: string;
};

export type ForwardMacdDist52DedupExclSpringMetrics = {
  labelJa: string;
  eventCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxConsecutiveLosses: number;
  maxDrawdownPct: number;
  cumulativeReturnPct: number;
};

export type ForwardMacdDist52ClusterMacroGroupId = 'cluster' | 'other';

export type ForwardMacdDist52ClusterMacroGroupStats = {
  groupId: ForwardMacdDist52ClusterMacroGroupId;
  labelJa: string;
  tradeCount: number;
  avgVix: number | null;
  avgSpyRet63Pct: number | null;
  avgDist52wPct: number | null;
  avgMacdHistPct: number | null;
  avgAdx14: number | null;
  vixSampleCount: number;
  spySampleCount: number;
};

export type ForwardMacdDist52ClusterMacroMetricId = 'vix' | 'spy_ret63' | 'dist52' | 'macd' | 'adx';

export type ForwardMacdDist52ClusterMacroCompareRow = {
  metricId: ForwardMacdDist52ClusterMacroMetricId;
  labelJa: string;
  unit: string;
  clusterAvg: number | null;
  otherAvg: number | null;
  deltaClusterMinusOther: number | null;
};

export type ForwardVixSpyBucketRow = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
};

export type ForwardVixSpyBucketSection = {
  factorLabelJa: string;
  rows: ForwardVixSpyBucketRow[];
  classifiedCount: number;
  missingCount: number;
};

export type ForwardVixSpyBucketAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  vixDataAvailable: boolean;
  vixSection: ForwardVixSpyBucketSection;
  spySection: ForwardVixSpyBucketSection;
  humanSummaryJa: string;
};

export type ForwardVixSpyCrossVixBucketId = 'vix_under_20' | 'vix_20_25' | 'vix_25_plus';
export type ForwardVixSpyCrossSpyBucketId = 'spy_ge_5' | 'spy_0_5' | 'spy_m5_0' | 'spy_le_m5';

export type ForwardVixSpyCrossCell = {
  vixBucketId: ForwardVixSpyCrossVixBucketId;
  vixLabelJa: string;
  spyBucketId: ForwardVixSpyCrossSpyBucketId;
  spyLabelJa: string;
  cellLabelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
};

export type ForwardVixSpyCrossAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  classifiedCount: number;
  unclassifiedCount: number;
  vixBucketLabels: string[];
  spyBucketLabels: string[];
  cells: ForwardVixSpyCrossCell[];
  humanSummaryJa: string;
};

export type ForwardVixSpyFourGroupId = 'A' | 'B' | 'C' | 'D';

export type ForwardVixSpyFourGroupSnapshot = {
  groupId: ForwardVixSpyFourGroupId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgMacd: number | null;
  avgDist52: number | null;
  avgAdx: number | null;
};

export type ForwardVixSpyFourGroupAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  groups: ForwardVixSpyFourGroupSnapshot[];
  humanSummaryJa: string;
};

export type ForwardSpyVixDist52ComboId =
  | 'spy_only'
  | 'vix_only'
  | 'dist52_only'
  | 'spy_vix'
  | 'spy_dist52'
  | 'vix_dist52'
  | 'spy_vix_dist52';

export type ForwardSpyVixDist52ComboRow = {
  comboId: ForwardSpyVixDist52ComboId;
  labelJa: string;
  tierJa: string;
  conditionKeysJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardSpyVixDist52ComboAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  spyThresholdPct: number;
  vixThreshold: number;
  dist52ThresholdPct: number;
  rows: ForwardSpyVixDist52ComboRow[];
  humanSummaryJa: string;
};

export type ForwardVix25SubBucketId = 'v25_30' | 'v30_35' | 'v35_plus';

export type ForwardVix25SubBucketRow = {
  bucketId: ForwardVix25SubBucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgVix: number | null;
};

export type ForwardVix25SubBucketAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  buckets: ForwardVix25SubBucketRow[];
  humanSummaryJa: string;
};

export type ForwardVix25MacdBucketId = 'm25_40' | 'm40_60' | 'm60_plus';

export type ForwardVix25MacdDistRow = {
  bucketId: ForwardVix25MacdBucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgMacd: number | null;
};

export type ForwardVix25MacdDistAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  bucketedCount: number;
  below25Count: number;
  buckets: ForwardVix25MacdDistRow[];
  humanSummaryJa: string;
};

export type ForwardVix25Dist52BucketId = 'd10_12' | 'd12_15' | 'd15_plus';

export type ForwardVix25Dist52Row = {
  bucketId: ForwardVix25Dist52BucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgDist52: number | null;
};

export type ForwardVix25Dist52AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  bucketedCount: number;
  shallowerThan10Count: number;
  buckets: ForwardVix25Dist52Row[];
  humanSummaryJa: string;
};

export type ForwardVix25WinnerHoldBucketId = 'd1_5' | 'd6_10' | 'd11_15' | 'd16_20' | 'd21_25';

export type ForwardVix25WinnerHoldRow = {
  bucketId: ForwardVix25WinnerHoldBucketId;
  labelJa: string;
  tradeCount: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardVix25WinnerHoldAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  winnerCount: number;
  lossInCohortCount: number;
  cohortMinVix: number;
  bucketedCount: number;
  buckets: ForwardVix25WinnerHoldRow[];
  humanSummaryJa: string;
};

export type ForwardVix25ForwardHorizonDays = 1 | 3 | 5 | 10;

export type ForwardVix25ForwardReturnHorizonRow = {
  horizonDays: ForwardVix25ForwardHorizonDays;
  labelJa: string;
  sampleCount: number;
  avgReturnPct: number | null;
  medianReturnPct: number | null;
  winRatePct: number;
};

export type ForwardVix25ForwardReturnAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  horizons: ForwardVix25ForwardReturnHorizonRow[];
  humanSummaryJa: string;
};

export type ForwardVix25MaeBucketId = 'm0_1' | 'm1_2' | 'm2_3' | 'm3_plus';

export type ForwardVix25MaeTradeRow = {
  id: string;
  symbol: ForwardEtfSymbol;
  signalDate: string;
  entryDate: string;
  exitDate: string;
  returnPct: number;
  holdDays: number;
  exitReason: 'take_profit' | 'max_hold';
  vix: number | null;
  maePct: number;
  mfePct: number;
  maeBucketId: ForwardVix25MaeBucketId;
  maeBucketLabelJa: string;
};

export type ForwardVix25MaeBucketRow = {
  bucketId: ForwardVix25MaeBucketId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgHoldDays: number | null;
};

export type ForwardVix25MaeSummary = {
  avgMaePct: number | null;
  medianMaePct: number | null;
  maxMaePct: number | null;
  avgMfePct: number | null;
  medianMfePct: number | null;
  maxMfePct: number | null;
};

export type ForwardVix25MaeMfeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  skippedCount: number;
  trades: ForwardVix25MaeTradeRow[];
  buckets: ForwardVix25MaeBucketRow[];
  maeSummary: ForwardVix25MaeSummary;
  humanSummaryJa: string;
};

export type ForwardVix25MaeWorst10Row = {
  rank: number;
  signalDate: string;
  symbol: ForwardEtfSymbol;
  returnPct: number;
  maePct: number;
  mfePct: number;
  holdDays: number;
  vix: number | null;
  spyRet63Pct: number | null;
  dist52wPct: number;
  macdHistPct: number;
  adx14: number;
};

export type ForwardVix25MaeWorst10AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  skippedCount: number;
  worst10: ForwardVix25MaeWorst10Row[];
  humanSummaryJa: string;
};

export type ForwardVix25SpyEtfForwardReturnRow = {
  symbol: ForwardEtfSymbol;
  tradeCount: number;
  avgReturn1dPct: number | null;
  avgReturn3dPct: number | null;
  avgReturn5dPct: number | null;
  avgReturn10dPct: number | null;
};

export type ForwardVix25SpyEtfForwardReturnAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  spyThresholdPct: number;
  byEtf: ForwardVix25SpyEtfForwardReturnRow[];
  humanSummaryJa: string;
};

export type ForwardVix25SpyGapTradeRow = {
  signalDate: string;
  symbol: ForwardEtfSymbol;
  entryDate: string;
  entryClose: number;
  nextOpen: number;
  gapPct: number;
};

export type ForwardVix25SpyGapSummary = {
  avgGapPct: number | null;
  medianGapPct: number | null;
  maxGapPct: number | null;
  minGapPct: number | null;
};

export type ForwardVix25SpyGapAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  cohortMinVix: number;
  spyThresholdPct: number;
  skippedCount: number;
  summary: ForwardVix25SpyGapSummary;
  trades: ForwardVix25SpyGapTradeRow[];
  humanSummaryJa: string;
};

export type ForwardFiveFactorConditionId = 'spy' | 'dist52' | 'macd' | 'vix' | 'adx';

export type ForwardFiveFactorSweepRow = {
  tierJa: '単独' | '2条件' | '3条件';
  comboLabelJa: string;
  conditionKeysJa: string;
  conditionIds: ForwardFiveFactorConditionId[];
  matchCount: number;
  matchPctOf96: number;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardFiveFactorSweepAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  singles: ForwardFiveFactorSweepRow[];
  pairs: ForwardFiveFactorSweepRow[];
  triples: ForwardFiveFactorSweepRow[];
  allRows: ForwardFiveFactorSweepRow[];
  humanSummaryJa: string;
};

export type ForwardVixThresholdSweepRow = {
  vixThreshold: number;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgHoldDays: number | null;
  avgMaePct: number | null;
  avgMfePct: number | null;
};

export type ForwardVixThresholdSweepAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  vixMissingCount: number;
  rows: ForwardVixThresholdSweepRow[];
  humanSummaryJa: string;
};

export type ForwardVix24StackId = 's1' | 's2' | 's3' | 's4' | 's5' | 's6' | 's7' | 's8';

export type ForwardVix24StackRow = {
  stackId: ForwardVix24StackId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
  avgHoldDays: number | null;
  avgMaePct: number | null;
  avgMfePct: number | null;
};

export type ForwardVix24StackAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  vixBase: number;
  rows: ForwardVix24StackRow[];
  humanSummaryJa: string;
};

export type ForwardVix24ExitCompareId = 'exitA' | 'exitB' | 'exitC' | 'exitD' | 'exitE';

export type ForwardVix24ExitCompareRow = {
  exitId: ForwardVix24ExitCompareId;
  labelJa: string;
  takeProfitPct: number;
  isBaseline: boolean;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  avgHoldDays: number | null;
  maxHoldRatePct: number;
  avgMaePct: number | null;
  avgMfePct: number | null;
};

export type ForwardVix24ExitCompareAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortCount: number;
  vixBase: number;
  maxHoldDays: number;
  rows: ForwardVix24ExitCompareRow[];
  humanSummaryJa: string;
};

export type ForwardVixBandId = 'b24_26' | 'b26_28' | 'b28_30' | 'b30_plus';

export type ForwardVixBandRow = {
  bandId: ForwardVixBandId;
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  avgHoldDays: number | null;
  maxHoldRatePct: number;
  avgMaePct: number | null;
  avgMfePct: number | null;
  avgVix: number | null;
};

export type ForwardVixBandAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  bandedCount: number;
  below24Count: number;
  bands: ForwardVixBandRow[];
  humanSummaryJa: string;
};

export type ForwardVix24StreakLossTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  vix: number | null;
  adx14: number;
  macdHistPct: number;
  dist52wPct: number;
  bucket: string;
  spyRegime: string;
  holdDays: number;
  exitReason: string;
};

export type ForwardVix24StreakEpisode = {
  streakLength: number;
  startDate: string;
  endDate: string;
  trades: ForwardVix24StreakLossTradeRow[];
};

export type ForwardVix24StreakMonthlyRow = {
  month: string;
  tradeCount: number;
  avgReturnPct: number | null;
  sumReturnPct: number;
};

export type ForwardVix24StreakYearlyRow = {
  year: string;
  tradeCount: number;
  avgReturnPct: number | null;
  sumReturnPct: number;
};

export type ForwardVix24StreakCurvePoint = {
  index: number;
  signalDate: string;
  symbol: string;
  returnPct: number;
  outcomeJa: string;
  cumulativeReturnPct: number;
  vix: number | null;
};

export type ForwardVix24StreakAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortTradeCount: number;
  vixThreshold: number;
  winCount: number;
  lossCount: number;
  maxConsecutiveWins: number;
  maxConsecutiveLosses: number;
  lossStreakEpisodes: ForwardVix24StreakEpisode[];
  allLossTrades: ForwardVix24StreakLossTradeRow[];
  monthly: ForwardVix24StreakMonthlyRow[];
  yearly: ForwardVix24StreakYearlyRow[];
  curve: ForwardVix24StreakCurvePoint[];
  finalCumulativeReturnPct: number;
  humanSummaryJa: string;
};

export type ForwardVix24EffectivenessTradeRow = {
  entryDate: string;
  ticker: string;
  entryPrice: number;
  exitDate: string;
  exitPrice: number;
  holdingDays: number;
  maxDrawdown: number;
  maxProfit: number;
  returnPct: number;
};

export type ForwardVix24LookaheadCheck = {
  id: string;
  labelJa: string;
  passed: boolean;
  detailJa: string;
};

export type ForwardVix24EffectivenessAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortTradeCount: number;
  vixThreshold: number;
  avgMaxDrawdownPct: number | null;
  avgUnrealizedLossPct: number | null;
  worst10Drawdown: ForwardVix24EffectivenessTradeRow[];
  holdingDaysMean: number | null;
  holdingDaysMedian: number | null;
  holdingDaysMax: number | null;
  holdingDaysMin: number | null;
  nextDayPositiveRatePct: number | null;
  nextDayNegativeRatePct: number | null;
  nextDaySampleCount: number;
  fiveDayAvgReturnPct: number | null;
  fiveDayWinRatePct: number | null;
  fiveDaySampleCount: number;
  lookaheadChecks: ForwardVix24LookaheadCheck[];
  trades: ForwardVix24EffectivenessTradeRow[];
  humanSummaryJa: string;
};

export type ForwardVix24OpenEntryMetrics = {
  entryModeJa: string;
  tradeCount: number;
  winCount: number;
  lossCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgMaxDrawdownPct: number | null;
  nextDayWinRatePct: number | null;
  fiveDayWinRatePct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardVix24OpenEntryCompareRow = {
  metricJa: string;
  closeValue: string;
  openValue: string;
  delta: string;
};

export type ForwardVix24OpenEntryAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortTradeCount: number;
  vixThreshold: number;
  closeMetrics: ForwardVix24OpenEntryMetrics;
  openMetrics: ForwardVix24OpenEntryMetrics;
  comparison: ForwardVix24OpenEntryCompareRow[];
  liveCandidate: boolean;
  liveCandidateVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardVix24PeriodSplitId =
  | 'y2024'
  | 'y2025_q1'
  | 'y2025_apr_may'
  | 'y2025_jun_plus';

export type ForwardVix24PeriodSplitRow = {
  periodId: ForwardVix24PeriodSplitId;
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgMaxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardVix24VixOccurrenceCounts = {
  vixGte24Days: number;
  vixGte30Days: number;
  vixGte35Days: number;
  totalTradingDays: number;
};

export type ForwardVix24PeriodConcentrationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortTradeCount: number;
  vixThreshold: number;
  periods: ForwardVix24PeriodSplitRow[];
  vixOccurrences: ForwardVix24VixOccurrenceCounts;
  totalCumulativeReturnPct: number;
  aprMay2025CumulativeReturnPct: number;
  profitConcentrationAprMay2025Pct: number | null;
  concentrationVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardSixLossDetailRow = {
  entryDate: string;
  ticker: string;
  returnPct: number;
  holdingDays: number;
  signalDate: string;
  vix: number | null;
  adx14: number;
  macdHistPct: number;
  spy63Pct: number | null;
  dist52wPct: number;
  bucket: string;
  spyRegime: string;
  exitReason: string;
  vixGte24: boolean;
};

export type ForwardSixLossComparison = {
  avgVixWin: number | null;
  avgVixLoss: number | null;
  avgAdxWin: number | null;
  avgAdxLoss: number | null;
  avgMacdWin: number | null;
  avgMacdLoss: number | null;
  vixDelta: number | null;
  adxDelta: number | null;
  macdDelta: number | null;
};

export type ForwardSixLossRootCauseAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  winCount: number;
  lossCount: number;
  lossRows: ForwardSixLossDetailRow[];
  comparison: ForwardSixLossComparison;
  commonTraits: string[];
  commonTraitsJa: string;
  vix24Threshold: number;
  vix24AvoidedLossCount: number;
  vix24NotAvoidedLossCount: number;
  lossAvoidanceRatePct: number | null;
  lossAvoidanceVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardDistributionBucketRow = {
  labelJa: string;
  tradeCount: number;
  avgReturnPct: number | null;
};

export type ForwardVix24WinnerStrengthAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortTradeCount: number;
  vixThreshold: number;
  vixBuckets: ForwardDistributionBucketRow[];
  adxBuckets: ForwardDistributionBucketRow[];
  macdBuckets: ForwardDistributionBucketRow[];
  vixReturnCorrelation: number | null;
  adxReturnCorrelation: number | null;
  macdReturnCorrelation: number | null;
  top10CommonTraitsJa: string;
  top10Trades: (ForwardPassedTradeRecord & { vix: number | null })[];
  humanSummaryJa: string;
};

export type ForwardVix24HistoryPerformanceRow = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgMaxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardVix24HistoryYearRow = ForwardVix24HistoryPerformanceRow & {
  year: string;
  vixGte24Days: number;
  vixGte24SignalCount: number;
};

export type ForwardVix24ExtendedHistoryAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  vixThreshold: number;
  conditionLabelJa: string;
  totalSignalCount: number;
  yearly: ForwardVix24HistoryYearRow[];
  specialPeriods: ForwardVix24HistoryPerformanceRow[];
  aprMay2025Comparison: ForwardVix24HistoryPerformanceRow[];
  outsideAprMay2025: ForwardVix24HistoryPerformanceRow;
  humanSummaryJa: string;
};

export type ForwardBacktestCapitalAuditRow = {
  capitalJpy: number;
  executedCount: number;
  skippedCount: number;
  skippedConcurrent: number;
  skippedCapital: number;
  canExecuteAllUnderMaxConcurrent: boolean;
  peakOneShareCapitalJpy: number;
  canTakeAllSignalsOneShare: boolean;
};

export type ForwardBacktestEtfPerformanceRow = {
  symbol: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgMaxDrawdownPct: number | null;
};

export type ForwardBacktestFeasibilityGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardBacktestQualityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  cohortTradeCount: number;
  maxSameDaySignalCount: number;
  maxSameDaySignalDate: string | null;
  avgSameDaySignalCount: number | null;
  maxConcurrentHoldings: number;
  maxConcurrentDate: string | null;
  capitalAudits: ForwardBacktestCapitalAuditRow[];
  etfPerformance: ForwardBacktestEtfPerformanceRow[];
  dedupTradeCount: number;
  dedupWinRatePct: number;
  dedupAvgReturnPct: number | null;
  dedupCumulativeReturnPct: number;
  survivorshipFirstBarDates: Record<string, string>;
  survivorshipBiasNotesJa: string;
  feasibilityGrade: ForwardBacktestFeasibilityGrade;
  feasibilityVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardOperationalRebacktestMetrics = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  avgMaxDrawdownPct: number | null;
  worstTradeMaxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  skippedSignalCount: number;
};

export type ForwardOperationalRebacktestYearRow = Omit<
  ForwardOperationalRebacktestMetrics,
  'skippedSignalCount'
> & {
  year: string;
};

export type ForwardOperationalRebacktestCompareRow = {
  metricJa: string;
  operationalValue: string;
  theoreticalValue: string;
  deltaValue: string;
};

export type ForwardOperationalRebacktestAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  operationalRulesJa: string;
  operational: ForwardOperationalRebacktestMetrics;
  theoretical: ForwardOperationalRebacktestMetrics;
  operationalYearly: ForwardOperationalRebacktestYearRow[];
  theoreticalYearly: ForwardOperationalRebacktestYearRow[];
  comparison: ForwardOperationalRebacktestCompareRow[];
  feasibilityGrade: ForwardBacktestFeasibilityGrade;
  feasibilityVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardOperationalAllocationSchemeId = 'A' | 'B' | 'C';

export type ForwardOperationalAllocationMetrics = {
  schemeId: ForwardOperationalAllocationSchemeId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardOperationalAllocationCompareRow = {
  metricJa: string;
  schemeA: string;
  schemeB: string;
  schemeC: string;
};

export type ForwardOperationalAllocationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  baselineTradeCount: number;
  baselineWinRatePct: number;
  schemes: ForwardOperationalAllocationMetrics[];
  comparison: ForwardOperationalAllocationCompareRow[];
  humanSummaryJa: string;
};

export type ForwardOosPeriodId = 'in_sample' | 'out_of_sample';

export type ForwardOosPeriodMetrics = {
  periodId: ForwardOosPeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardOosYearRow = {
  year: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardOosCompareRow = {
  metricJa: string;
  inSampleValue: string;
  outOfSampleValue: string;
  deltaValue: string;
};

export type ForwardOosOverfitVerdict = 'none' | 'mild' | 'suspected' | 'clear';

export type ForwardOosValidationAuditReport = {
  auditedAt: string;
  trainFrom: string;
  trainTo: string;
  testFrom: string;
  testTo: string;
  fixedConditionsJa: string;
  inSample: ForwardOosPeriodMetrics;
  outOfSample: ForwardOosPeriodMetrics;
  oosYearly: ForwardOosYearRow[];
  comparison: ForwardOosCompareRow[];
  overfitVerdict: ForwardOosOverfitVerdict;
  overfitVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardWalkForwardPeriodMetrics = {
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardWalkForwardFoldRow = {
  foldId: number;
  trainFrom: string;
  trainTo: string;
  testYear: string;
  train: ForwardWalkForwardPeriodMetrics;
  test: ForwardWalkForwardPeriodMetrics;
  winRateDegradationPct: number | null;
  avgReturnDegradationPct: number | null;
  cumulativeDegradationPct: number | null;
};

export type ForwardWalkForwardAuditReport = {
  auditedAt: string;
  fixedConditionsJa: string;
  folds: ForwardWalkForwardFoldRow[];
  aggregateTest: ForwardWalkForwardPeriodMetrics;
  avgWinRateDegradationPct: number | null;
  avgReturnDegradationPct: number | null;
  foldsWithTestTrades: number;
  overfitVerdict: ForwardOosOverfitVerdict;
  overfitVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardVixSensitivityVerdict = 'optimal_24' | 'robust_range' | 'not_optimal_24';

export type ForwardVixSensitivityRow = {
  vixThreshold: number;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardVixSensitivityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  operationalRulesJa: string;
  thresholds: number[];
  rows: ForwardVixSensitivityRow[];
  baselineThreshold: number;
  verdict: ForwardVixSensitivityVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardSurvivorshipCohortMetrics = {
  labelJa: string;
  universeSize: number;
  symbols: string[];
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  extendedOnlyTradeCount?: number;
};

export type ForwardSurvivorshipCompareRow = {
  metricJa: string;
  baseline4: string;
  extendedAll: string;
  delta: string;
};

export type ForwardSurvivorshipBiasVerdict =
  | 'not_biased'
  | 'selection_bias_suspected'
  | 'baseline_conservative'
  | 'mixed';

export type ForwardSurvivorshipAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baseline4: ForwardSurvivorshipCohortMetrics;
  extendedAll: ForwardSurvivorshipCohortMetrics;
  comparison: ForwardSurvivorshipCompareRow[];
  fetchedSymbols: string[];
  failedSymbols: string[];
  firstBarDates: Record<string, string>;
  biasVerdict: ForwardSurvivorshipBiasVerdict;
  biasVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardMarketDependencyCohortId =
  | 'us'
  | 'europe'
  | 'japan'
  | 'global'
  | 'developed'
  | 'combined_non_us'
  | 'all_markets';

export type ForwardMarketDependencyCohortMetrics = {
  cohortId: ForwardMarketDependencyCohortId;
  labelJa: string;
  symbols: string[];
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardMarketDependencyCompareRow = {
  metricJa: string;
  usBaseline: string;
  europe: string;
  japan: string;
  global: string;
  developed: string;
};

export type ForwardMarketDependencyVerdict =
  | 'universal_reversal'
  | 'us_specific'
  | 'partial_universal'
  | 'mixed';

export type ForwardMarketDependencyAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  noteJa: string;
  cohorts: ForwardMarketDependencyCohortMetrics[];
  usBaseline: ForwardMarketDependencyCohortMetrics;
  combinedNonUs: ForwardMarketDependencyCohortMetrics;
  allMarkets: ForwardMarketDependencyCohortMetrics;
  comparison: ForwardMarketDependencyCompareRow[];
  fetchedSymbols: string[];
  failedSymbols: string[];
  firstBarDates: Record<string, string>;
  dependencyVerdict: ForwardMarketDependencyVerdict;
  dependencyVerdictJa: string;
  humanSummaryJa: string;
};

export type ForwardTpTargetSensitivityVerdict = 'optimal_tp3' | 'robust_tp3' | 'accidental_tp3';

export type ForwardTpTargetSensitivityRow = {
  takeProfitPct: number;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardTpTargetSensitivityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  levels: number[];
  baselineTakeProfitPct: number;
  rows: ForwardTpTargetSensitivityRow[];
  verdict: ForwardTpTargetSensitivityVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardHoldPeriodDistributionBucket = {
  bucketLabelJa: string;
  tradeCount: number;
  sharePct: number;
};

export type ForwardHoldPeriodProfitCapturePoint = {
  withinDays: number;
  tradeCount: number;
  tradeSharePct: number;
  returnSharePct: number;
};

export type ForwardHoldPeriodSensitivityVerdict =
  | 'optimal_hold25'
  | 'robust_hold25'
  | 'hold25_suboptimal';

export type ForwardHoldPeriodSensitivityRow = {
  maxHoldDays: number;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
  avgHoldDays: number | null;
  medianHoldDays: number | null;
  holdDistribution: ForwardHoldPeriodDistributionBucket[];
};

export type ForwardHoldPeriodSensitivityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  levels: number[];
  baselineMaxHoldDays: number;
  rows: ForwardHoldPeriodSensitivityRow[];
  baselineProfitCapture: ForwardHoldPeriodProfitCapturePoint[];
  verdict: ForwardHoldPeriodSensitivityVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardRuleContributionScenarioId =
  | 'baseline'
  | 'no_adx'
  | 'no_macd'
  | 'no_52w'
  | 'no_spy63'
  | 'no_vix';

export type ForwardRuleContributionRow = {
  scenarioId: ForwardRuleContributionScenarioId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardRuleContributionDegradation = {
  scenarioId: ForwardRuleContributionScenarioId;
  labelJa: string;
  tradeCountDelta: number;
  tradeCountDeltaPct: number | null;
  winRateDegradationPct: number | null;
  avgReturnDegradationPct: number | null;
  maxDrawdownWorseningPct: number | null;
  cumulativeDegradationPct: number | null;
  profitEfficiencyDegradationPct: number | null;
  overallDegradationPct: number | null;
};

export type ForwardRuleContributionVerdict =
  | 'multi_rule_critical'
  | 'clear_contributor'
  | 'mixed_contribution'
  | 'mixed';

export type ForwardRuleContributionAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedRulesJa: string;
  baseline: ForwardRuleContributionRow;
  rows: ForwardRuleContributionRow[];
  degradations: ForwardRuleContributionDegradation[];
  rankedRuleLabelsJa: string[];
  verdict: ForwardRuleContributionVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardAdxDiffTradeRow = {
  signalDate: string;
  symbol: string;
  entryDate: string;
  returnPct: number;
  adx14: number;
  win: boolean;
};

export type ForwardAdxSensitivityVerdict =
  | 'optimal_adx25'
  | 'robust_adx25'
  | 'adx_quality_filter'
  | 'adx25_strict'
  | 'mixed';

export type ForwardAdxSensitivityRow = {
  adxThreshold: number | null;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardAdxSymbolSummaryNoneOnly = {
  symbol: string;
  count: number;
  cumulativeReturnPct: number;
};

export type ForwardAdxSensitivityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  levels: (number | null)[];
  baselineAdxThreshold: number;
  rows: ForwardAdxSensitivityRow[];
  adxNoneOnlyTrades: ForwardAdxDiffTradeRow[];
  adx25OnlyTrades: ForwardAdxDiffTradeRow[];
  symbolSummaryNoneOnly: ForwardAdxSymbolSummaryNoneOnly[];
  verdict: ForwardAdxSensitivityVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardAdx20ExtraTradeRow = {
  symbol: string;
  signalDate: string;
  returnPct: number;
  holdDays: number;
  adx14: number;
};

export type ForwardAdx20ValidationMetrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardAdx20ValidationVerdict =
  | 'genuine_adx20_superiority'
  | 'extra_trades_driven'
  | 'marginal_extra_driven'
  | 'mixed';

export type ForwardAdx20ValidationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  adx20: ForwardAdx20ValidationMetrics;
  adx25: ForwardAdx20ValidationMetrics;
  adx20WithoutExtras: ForwardAdx20ValidationMetrics;
  extraTrades: ForwardAdx20ExtraTradeRow[];
  adx25OnlyTrades: ForwardAdx20ExtraTradeRow[];
  netExecutionCountDelta: number;
  extraTradesWinRatePct: number;
  extraTradesCumulativeReturnPct: number;
  cumulativeDeltaAdx20Vs25: number;
  extraContributionPct: number | null;
  sharedTradeCount: number;
  superiorityDriverJa: string;
  verdict: ForwardAdx20ValidationVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardLowAdxSymbolStats = {
  symbol: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
  avgReturnPct: number | null;
  maxLossPct: number | null;
};

export type ForwardAdxBandLowAdxStats = {
  bandId: 'band_15_20' | 'band_20_25' | 'band_other';
  labelJa: string;
  adxMinExclusive: number;
  adxMaxInclusive: number;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
  avgReturnPct: number | null;
  maxLossPct: number | null;
  bySymbol: ForwardLowAdxSymbolStats[];
};

export type ForwardDgroLowAdxVerdict =
  | 'dgro_specific'
  | 'strategy_wide'
  | 'mixed'
  | 'insufficient';

export type ForwardDgroLowAdxAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  targetTradeCount: number;
  targetTrades: ForwardAdx20ExtraTradeRow[];
  symbolStats: ForwardLowAdxSymbolStats[];
  band1520: ForwardAdxBandLowAdxStats;
  band2025: ForwardAdxBandLowAdxStats;
  bandOther: ForwardAdxBandLowAdxStats;
  verdict: ForwardDgroLowAdxVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardAdx20IndependencePeriodRow = {
  period: string;
  tradeCount: number;
  cumulativeReturnPct: number;
};

export type ForwardAdx20IndependenceStreakRow = {
  symbol: string;
  spyRegime: string;
  streakLength: number;
  startDate: string;
  endDate: string;
  cumulativeReturnPct: number;
  signalDates: string[];
};

export type ForwardAdx20IndependenceEventRow = {
  eventId: number;
  symbol: string;
  spyRegime: string;
  tradeCount: number;
  startDate: string;
  endDate: string;
  cumulativeReturnPct: number;
  win: boolean;
  signalDates: string[];
};

export type ForwardAdx20IndependenceVerdict =
  | 'genuine_independence'
  | 'cluster_concentrated'
  | 'mixed';

export type ForwardAdx20IndependenceAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  eventMaxGapCalendarDays: number;
  targetTradeCount: number;
  independentEventCount: number;
  compressionRatio: number;
  tradeWinRatePct: number;
  tradeCumulativeReturnPct: number;
  eventWinRatePct: number;
  eventCumulativeReturnPct: number;
  topYearTradeSharePct: number;
  topYearCumulativeSharePct: number;
  yearly: ForwardAdx20IndependencePeriodRow[];
  monthly: ForwardAdx20IndependencePeriodRow[];
  consecutiveStreaks: ForwardAdx20IndependenceStreakRow[];
  events: ForwardAdx20IndependenceEventRow[];
  verdict: ForwardAdx20IndependenceVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardAdxYearlyThresholdMetrics = {
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  cumulativeReturnPct: number;
  maxDrawdownPct: number | null;
};

export type ForwardAdxYearlyCompareRow = {
  year: string;
  adx20: ForwardAdxYearlyThresholdMetrics;
  adx25: ForwardAdxYearlyThresholdMetrics;
  cumulativeDelta20Minus25: number;
  superiorThreshold: 'adx20' | 'adx25' | 'tie';
};

export type ForwardAdxYearlyOptimalVerdict =
  | 'multi_year_adx20'
  | 'year_2020_only'
  | 'adx25_dominant'
  | 'mixed';

export type ForwardAdxYearlyOptimalAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  years: string[];
  yearlyRows: ForwardAdxYearlyCompareRow[];
  adx20SuperiorYearCount: number;
  adx25SuperiorYearCount: number;
  tieYearCount: number;
  adx20SuperiorYears: string[];
  adx25SuperiorYears: string[];
  verdict: ForwardAdxYearlyOptimalVerdict;
  verdictJa: string;
  humanSummaryJa: string;
};

export type ForwardAdx20WalkForwardPhaseMetrics = ForwardAdxYearlyThresholdMetrics;

export type ForwardAdx20WalkForwardTestOnlyTradeRow = {
  signalDate: string;
  symbol: string;
  adx14: number;
  returnPct: number;
  holdDays: number;
};

export type ForwardAdx20WalkForwardVerdict =
  | 'adx20_adoption_valid'
  | 'overfit_suspected'
  | 'adx25_preferred'
  | 'mixed';

export type ForwardAdx20WalkForwardAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  trainFrom: string;
  trainTo: string;
  testFrom: string;
  testTo: string;
  trainAdx20: ForwardAdx20WalkForwardPhaseMetrics;
  trainAdx25: ForwardAdx20WalkForwardPhaseMetrics;
  testAdx20: ForwardAdx20WalkForwardPhaseMetrics;
  testAdx25: ForwardAdx20WalkForwardPhaseMetrics;
  phase1Winner: 'adx20' | 'adx25' | 'tie';
  testSuperior: 'adx20' | 'adx25' | 'tie';
  testOnlyAdx20Trades: ForwardAdx20WalkForwardTestOnlyTradeRow[];
  verdict: ForwardAdx20WalkForwardVerdict;
  verdictJa: string;
  futureAdx20Superior: boolean;
  adoptionValid: boolean;
  recommendedAdxThreshold: 20 | 25;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  humanSummaryJa: string;
};

export type ForwardDist52Adx20Metrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardDist52Adx20AddedTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
};

export type ForwardDist52Adx20YearRow = {
  year: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardDist52Adx20AblationRankRow = {
  ruleId: string;
  labelJa: string;
  cumulativeDegradationPct: number | null;
  overallDegradationPct: number | null;
};

export type ForwardDist52Adx20Recommendation = 'maintain' | 'relax' | 'delete';

export type ForwardDist52Adx20AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  with52w: ForwardDist52Adx20Metrics;
  without52w: ForwardDist52Adx20Metrics;
  cumulativeDeltaWithoutMinusWith: number;
  addedTrades: ForwardDist52Adx20AddedTradeRow[];
  addedByYear: ForwardDist52Adx20YearRow[];
  ablationRankings: ForwardDist52Adx20AblationRankRow[];
  is52wMostImportant: boolean;
  opportunityLossPct: number;
  recommendation: ForwardDist52Adx20Recommendation;
  recommendationJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  humanSummaryJa: string;
};

export type ForwardVixAdx20Metrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardVixAdx20AddedTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  vix: number | null;
};

export type ForwardVixAdx20YearRow = {
  year: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardVixAdx20BandRow = {
  bandId: 'band_20_24' | 'band_24_30' | 'band_30_40' | 'band_40_plus';
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardVixAdx20ThresholdRow = {
  vixThreshold: number | null;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardVixAdx20Recommendation = 'maintain' | 'relax_20' | 'delete';

export type ForwardVixAdx20AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  withVix24: ForwardVixAdx20Metrics;
  withoutVix: ForwardVixAdx20Metrics;
  cumulativeDeltaWithoutMinusWith24: number;
  addedTrades: ForwardVixAdx20AddedTradeRow[];
  addedByYear: ForwardVixAdx20YearRow[];
  bandRows: ForwardVixAdx20BandRow[];
  thresholdRows: ForwardVixAdx20ThresholdRow[];
  recommendation: ForwardVixAdx20Recommendation;
  recommendationJa: string;
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardSpy63Adx20Metrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
};

export type ForwardSpy63Adx20AddedTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  spyRegime: string;
};

export type ForwardSpy63Adx20YearRow = {
  year: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardSpy63Adx20RegimeRow = {
  regime: 'up' | 'sideways' | 'down';
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardSpy63Adx20Recommendation = 'maintain' | 'relax' | 'delete';

export type ForwardSpy63Adx20FinalRuleRow = {
  ruleId: 'adx' | 'vix' | 'dist52' | 'spy63';
  labelJa: string;
  currentSettingJa: string;
  recommendedSettingJa: string;
  recommendationJa: string;
  auditRef: string;
};

export type ForwardSpy63Adx20AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  withSpy63: ForwardSpy63Adx20Metrics;
  withoutSpy63: ForwardSpy63Adx20Metrics;
  cumulativeDeltaWithoutMinusWith: number;
  addedTrades: ForwardSpy63Adx20AddedTradeRow[];
  addedByYear: ForwardSpy63Adx20YearRow[];
  regimeRows: ForwardSpy63Adx20RegimeRow[];
  finalRuleRecommendations: ForwardSpy63Adx20FinalRuleRow[];
  recommendation: ForwardSpy63Adx20Recommendation;
  recommendationJa: string;
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardFinalRulesAblationScenarioId =
  | 'baseline'
  | 'no_adx'
  | 'no_vix'
  | 'no_52w'
  | 'no_spy63'
  | 'no_adx_vix'
  | 'no_adx_52w'
  | 'no_adx_spy63'
  | 'no_vix_52w'
  | 'no_vix_spy63'
  | 'no_52w_spy63'
  | 'all_off';

export type ForwardFinalRulesAblationMetrics = {
  scenarioId: ForwardFinalRulesAblationScenarioId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitEfficiency: number | null;
  cumulativePctOfBaseline: number;
  winRatePctOfBaseline: number;
  profitEfficiencyPctOfBaseline: number | null;
};

export type ForwardFinalRulesAblationRuleId = 'adx' | 'vix' | 'dist52' | 'spy63';

export type ForwardFinalRulesAblationRuleRank = {
  ruleId: ForwardFinalRulesAblationRuleId;
  labelJa: string;
  cumulativeDegradationPct: number | null;
  maxDrawdownWorseningPct: number | null;
  winRateDegradationPct: number | null;
  qualityScore: number | null;
  profitRank: number;
  qualityRank: number;
};

export type ForwardFinalRulesAblationTier = 'required' | 'recommended' | 'optional';

export type ForwardFinalRulesAblationTierRow = {
  ruleId: ForwardFinalRulesAblationRuleId;
  labelJa: string;
  settingJa: string;
  tier: ForwardFinalRulesAblationTier;
  tierJa: string;
  rationaleJa: string;
};

export type ForwardFinalRulesAblationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  recommendedRulesJa: string;
  fixedConditionsJa: string;
  baseline: ForwardFinalRulesAblationMetrics;
  rows: ForwardFinalRulesAblationMetrics[];
  ruleRankings: ForwardFinalRulesAblationRuleRank[];
  tierRows: ForwardFinalRulesAblationTierRow[];
  auditConsistencyJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardPositionSizingSchemeId =
  | 'equal'
  | 'win_rate'
  | 'quality_score'
  | 'kelly_25'
  | 'kelly_50'
  | 'kelly_100';

export type ForwardPositionSizingMetrics = {
  schemeId: ForwardPositionSizingSchemeId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
  cagrPct: number | null;
  sharpe: number | null;
  sortino: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number | null;
  mar: number | null;
  finalEquityMultiplier: number;
};

export type ForwardPositionSizingCapitalRow = {
  capitalMYR: number;
  conservativePerSlotMYR: number;
  standardPerSlotMYR: number;
  aggressivePerSlotMYR: number;
  conservativeCashMYR: number;
  standardCashMYR: number;
  aggressiveCashMYR: number;
};

export type ForwardPositionSizingModelRow = {
  modelId: 'conservative' | 'standard' | 'aggressive';
  labelJa: string;
  schemeId: ForwardPositionSizingSchemeId;
  slotPct: number;
  cashReservePct: number;
  descriptionJa: string;
};

export type ForwardPositionSizingAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedRulesJa: string;
  baselineSlotPct: number;
  rows: ForwardPositionSizingMetrics[];
  capitalRows: ForwardPositionSizingCapitalRow[];
  modelRows: ForwardPositionSizingModelRow[];
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardExitStrategyScenarioId =
  | 'tp3_25'
  | 'tp4_25'
  | 'tp5_25'
  | 'tp6_25'
  | 'tp3_15'
  | 'tp3_20'
  | 'tp3_30'
  | 'tp3_40'
  | 'sl_none'
  | 'sl_5'
  | 'sl_7'
  | 'sl_10'
  | 'sl_atr15'
  | 'sl_atr2';

export type ForwardExitStrategyGroup = 'take_profit_hold' | 'stop_loss';

export type ForwardExitStrategyMetrics = {
  scenarioId: ForwardExitStrategyScenarioId;
  group: ForwardExitStrategyGroup;
  labelJa: string;
  takeProfitPct: number;
  maxHoldDays: number;
  stopLossJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  cagrPct: number | null;
  mar: number | null;
};

export type ForwardExitStrategyModelRow = {
  modelId: 'conservative' | 'standard' | 'aggressive';
  labelJa: string;
  takeProfitPct: number;
  maxHoldDays: number;
  stopLossJa: string;
  descriptionJa: string;
};

export type ForwardExitStrategyAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselineTakeProfitPct: number;
  baselineMaxHoldDays: number;
  tpHoldRows: ForwardExitStrategyMetrics[];
  stopLossRows: ForwardExitStrategyMetrics[];
  modelRows: ForwardExitStrategyModelRow[];
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardEtfUniverseCohortId =
  | 'current_4'
  | 'dividend_only'
  | 'index_only'
  | 'growth_only'
  | 'all_mixed';

export type ForwardEtfUniverseCohortMetrics = {
  cohortId: ForwardEtfUniverseCohortId;
  labelJa: string;
  symbols: string[];
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  sortino: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  cagrPct: number | null;
  mar: number | null;
};

export type ForwardEtfUniverseSymbolStats = {
  symbol: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  cumulativeReturnPct: number;
  profitFactor: number | null;
};

export type ForwardEtfUniverseModelRow = {
  modelId: 'conservative' | 'standard' | 'aggressive';
  labelJa: string;
  symbols: string[];
  descriptionJa: string;
};

export type ForwardEtfUniversePriorityRow = {
  rank: number;
  symbol: string;
  winRatePct: number;
  tradeCount: number;
  cumulativeReturnPct: number;
  noteJa: string;
};

export type ForwardEtfUniverseAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  fetchedSymbols: string[];
  failedSymbols: string[];
  cohortRows: ForwardEtfUniverseCohortMetrics[];
  perSymbolRows: ForwardEtfUniverseSymbolStats[];
  modelRows: ForwardEtfUniverseModelRow[];
  rm3000Priority: ForwardEtfUniversePriorityRow[];
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  humanSummaryJa: string;
};

export type ForwardRobustnessGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardRobustnessGridRow = {
  adxMin: number;
  vixThreshold: number;
  takeProfitPct: number;
  maxHoldDays: number;
  labelJa: string;
  isBaseline: boolean;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
};

export type ForwardRobustnessParamKey = 'adx' | 'vix' | 'takeProfit' | 'holdDays';

export type ForwardRobustnessParamSensitivity = {
  paramJa: string;
  paramKey: ForwardRobustnessParamKey;
  valuesTested: number[];
  cumulativeRangePct: number;
  cumulativeStdPct: number;
  marRange: number;
  worstDropFromBaselinePct: number;
  rank: number;
  fragileValuesJa: string;
  robustValuesJa: string;
};

export type ForwardRobustnessAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  baselineAdx: number;
  baselineVix: number;
  baselineTakeProfitPct: number;
  baselineMaxHoldDays: number;
  gridRows: ForwardRobustnessGridRow[];
  baselineRow: ForwardRobustnessGridRow;
  bestProfitRow: ForwardRobustnessGridRow;
  bestStableRow: ForwardRobustnessGridRow;
  sensitivityRows: ForwardRobustnessParamSensitivity[];
  grade: ForwardRobustnessGrade;
  gradeJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
  humanSummaryJa: string;
};

export type ForwardWalkForward31Grade = 'A' | 'B' | 'C' | 'D';

export type ForwardWalkForward31PhaseMetrics = {
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  mar: number | null;
};

export type ForwardWalkForward31FoldRow = {
  foldId: number;
  trainFrom: string;
  trainTo: string;
  testYear: string;
  testFrom: string;
  testTo: string;
  train: ForwardWalkForward31PhaseMetrics;
  test: ForwardWalkForward31PhaseMetrics;
  winRateDegradationPct: number | null;
  avgReturnDegradationPct: number | null;
  cumulativeDegradationPct: number | null;
  collapsed: boolean;
};

export type ForwardWalkForward31AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  folds: ForwardWalkForward31FoldRow[];
  aggregateTest: ForwardWalkForward31PhaseMetrics;
  avgWinRateDegradationPct: number | null;
  avgCumulativeDegradationPct: number | null;
  collapsedYears: string[];
  overfitVerdictJa: string;
  grade: ForwardWalkForward31Grade;
  gradeJa: string;
  operational2026Ja: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
  answer7Ja: string;
  humanSummaryJa: string;
};

export type ForwardMonteCarloStabilityGrade = 'A' | 'B' | 'C' | 'D';
export type ForwardMonteCarloOperationalGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMonteCarloDdBucket = {
  labelJa: string;
  minPct: number;
  maxPct: number;
  count: number;
  sharePct: number;
};

export type ForwardMonteCarloRm3000Row = {
  recommendedLotMYR: number;
  recommendedMaxLossMYR: number;
  recommendedCashReservePct: number;
  noteJa: string;
};

export type ForwardMonteCarloAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  simulationCount: number;
  tradeCount: number;
  baselineCumulativeReturnPct: number;
  baselineMaxDrawdownPct: number | null;
  meanCumulativeReturnPct: number;
  medianCumulativeReturnPct: number;
  ci95LowPct: number;
  ci95HighPct: number;
  worstCumulativeReturnPct: number;
  worstMaxDrawdownPct: number;
  meanSharpe: number | null;
  meanMar: number | null;
  ddBuckets: ForwardMonteCarloDdBucket[];
  bankruptcyRatePct: number;
  stabilityGrade: ForwardMonteCarloStabilityGrade;
  stabilityGradeJa: string;
  operationalGrade: ForwardMonteCarloOperationalGrade;
  operationalGradeJa: string;
  rm3000: ForwardMonteCarloRm3000Row;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
  answer7Ja: string;
  answer8Ja: string;
  answer9Ja: string;
  answer10Ja: string;
  humanSummaryJa: string;
};

export type ForwardBearStressPeriodId = 'covid2020' | 'bear2022' | 'since2025';

export type ForwardBearStressResilienceGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardBearStressPeriodMetrics = {
  periodId: ForwardBearStressPeriodId;
  labelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  cumulativeReturnPct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  maxConsecutiveLosses: number;
};

export type ForwardBearStressVixCompareRow = {
  periodId: ForwardBearStressPeriodId;
  labelJa: string;
  withVix: ForwardBearStressPeriodMetrics;
  withoutVix: ForwardBearStressPeriodMetrics;
  cumulativeDeltaPct: number;
  winRateDeltaPt: number;
};

export type ForwardBearStressLossTradeRow = {
  rank: number;
  signalDate: string;
  symbol: string;
  returnPct: number;
  holdDays: number;
  periodId: ForwardBearStressPeriodId;
  spyRegime: string;
};

export type ForwardBearStressRm3000Row = {
  bearMarketLotMYR: number;
  recommendedCashPct: number;
  recommendedMaxDrawdownPct: number;
  noteJa: string;
};

export type ForwardBearStressAuditReport = {
  auditedAt: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  periodRows: ForwardBearStressPeriodMetrics[];
  vixCompareRows: ForwardBearStressVixCompareRow[];
  worstLossTrades: ForwardBearStressLossTradeRow[];
  globalMaxConsecutiveLosses: number;
  bearSpecificRuleNeeded: boolean;
  bearSpecificRuleAnswerJa: string;
  resilienceGrade: ForwardBearStressResilienceGrade;
  resilienceGradeJa: string;
  rm3000: ForwardBearStressRm3000Row;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
  answer7Ja: string;
  answer8Ja: string;
  answer9Ja: string;
  humanSummaryJa: string;
};

export type ForwardEquityCurveImplementationGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardEquityCurvePoint = {
  date: string;
  equity: number;
  equityPct: number;
  peakEquityPct: number;
  drawdownPct: number;
  tradeIndex: number;
};

export type ForwardEquityCurveRollingPoint = {
  date: string;
  tradeIndex: number;
  windowTrades: number;
  rollingWinRatePct: number | null;
  rollingProfitFactor: number | null;
  rollingSharpe: number | null;
  rollingDrawdownPct: number;
};

export type ForwardEquityCurveStopKind = 'dd' | 'wr' | 'pf';

export type ForwardEquityCurveStopCandidate = {
  kind: ForwardEquityCurveStopKind;
  threshold: number;
  labelJa: string;
  stopSignalCount: number;
  falseStopCount: number;
  falseStopRatePct: number;
  brokenEpisodeCount: number;
  detectedEpisodeCount: number;
  medianDetectionDays: number | null;
  recommendationGrade: ForwardEquityCurveImplementationGrade;
};

export type ForwardEquityCurveBrokenEpisode = {
  episodeId: number;
  startDate: string;
  endDate: string;
  startTradeIndex: number;
  endTradeIndex: number;
  minDrawdownPct: number;
  windowWinRatePct: number;
};

export type ForwardEquityCurveRm3000Stop = {
  capitalMYR: number;
  stopDrawdownPct: number;
  stopLossAmountMYR: number;
  noteJa: string;
};

export type ForwardEquityCurveAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  tradeCount: number;
  equityCurve: ForwardEquityCurvePoint[];
  rollingSeries: ForwardEquityCurveRollingPoint[];
  stopCandidates: ForwardEquityCurveStopCandidate[];
  brokenEpisodes: ForwardEquityCurveBrokenEpisode[];
  finalEquityPct: number;
  maxDrawdownPct: number;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answer7Ja: string;
  answer8Ja: string;
  answer9Ja: string;
  answer10Ja: string;
  operationalStopProposalJa: string;
  operationalStopGrade: ForwardEquityCurveImplementationGrade;
  rm3000Stop: ForwardEquityCurveRm3000Stop;
  humanSummaryJa: string;
};

export type ForwardLotSizeAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardLotSizeSchemeKind = 'fixed_myr' | 'fixed_pct' | 'kelly' | 'win_rate';

export type ForwardLotSizeSchemeMetrics = {
  schemeId: string;
  kind: ForwardLotSizeSchemeKind;
  labelJa: string;
  lotMYR: number | null;
  deployPct: number | null;
  kellyFraction: number | null;
  tradeCount: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  bankruptcyRatePct: number;
  avgSlotMYR: number | null;
};

export type ForwardLotSizeCapitalRecommendation = {
  capitalMYR: number;
  optimalLotMYR: number;
  schemeId: string;
  labelJa: string;
  noteJa: string;
};

export type ForwardLotSizeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  referenceCapitalMYR: number;
  etfUniverse: string[];
  fixedConditionsJa: string;
  tradeCount: number;
  schemeRows: ForwardLotSizeSchemeMetrics[];
  capitalRecommendations: ForwardLotSizeCapitalRecommendation[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalLotMYR: number;
  operationalGrade: ForwardLotSizeAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardCompoundingAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardCompoundingModeId =
  | 'compound_yes'
  | 'compound_no'
  | 'reinvest_100'
  | 'reinvest_50'
  | 'reinvest_25'
  | 'reinvest_monthly'
  | 'reinvest_quarterly'
  | 'reinvest_annual';

export type ForwardCompoundingModeMetrics = {
  modeId: ForwardCompoundingModeId;
  labelJa: string;
  initialCapitalMYR: number;
  lotPerSlotMYR: number;
  horizonYears: number | null;
  tradeCount: number;
  finalEquityMYR: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  mar: number | null;
  bankruptcyRatePct: number;
  maxDrawdownDeltaPt: number | null;
  sharpeDelta: number | null;
  marDelta: number | null;
  bankruptcyDeltaPt: number | null;
};

export type ForwardCompoundingAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  tradeCount: number;
  baselineModeId: ForwardCompoundingModeId;
  modeRows: ForwardCompoundingModeMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalReinvestModeId: ForwardCompoundingModeId;
  operationalGrade: ForwardCompoundingAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardSymbolContributionAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardSymbolContributionSymbolMetrics = {
  symbol: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  contributionPct: number;
};

export type ForwardSymbolContributionExclusionRow = {
  excludedSymbol: string | null;
  labelJa: string;
  symbols: string[];
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  cumulativeDeltaVsFullPt: number | null;
};

export type ForwardSymbolContributionCompositionRow = {
  compositionId: string;
  symbols: string[];
  symbolCount: number;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardSymbolContributionCorrelationRow = {
  symbolA: string;
  symbolB: string;
  overlapMonths: number;
  correlation: number | null;
};

export type ForwardSymbolContributionDiversificationRow = {
  labelJa: string;
  cumulativeReturnPct: number;
  maxDrawdownPct: number | null;
  sharpe: number | null;
};

export type ForwardSymbolContributionAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  executedTradeCount: number;
  symbolRows: ForwardSymbolContributionSymbolMetrics[];
  period2022Rows: ForwardSymbolContributionSymbolMetrics[];
  periodSince2025Rows: ForwardSymbolContributionSymbolMetrics[];
  exclusionRows: ForwardSymbolContributionExclusionRow[];
  compositionRows: ForwardSymbolContributionCompositionRow[];
  correlationRows: ForwardSymbolContributionCorrelationRow[];
  diversificationRows: ForwardSymbolContributionDiversificationRow[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  recommendedComposition: string[];
  operationalGrade: ForwardSymbolContributionAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardSymbolWeightAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardSymbolWeightSchemeId =
  | 'current'
  | 'equal'
  | 'contribution'
  | 'sharpe_max'
  | 'mar_max'
  | 'dd_min'
  | 'hdv_heavy'
  | 'dgro_heavy'
  | 'qqq_heavy'
  | 'schd_heavy'
  | 'hdv_dgro_center'
  | 'hdv_dgro_qqq'
  | 'hdv_qqq'
  | 'dgro_qqq'
  | 'excl_schd'
  | 'excl_qqq';

export type ForwardSymbolWeightSchemeMetrics = {
  schemeId: ForwardSymbolWeightSchemeId;
  labelJa: string;
  universe: string[];
  selectionNoteJa: string;
  slotNoteJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  expectedProfitMYR: number;
  maxLossMYR: number;
  recommendedLotMYR: number;
  adoptionGrade: ForwardSymbolWeightAdoptionGrade;
};

export type ForwardSymbolWeightAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  etfUniverse: string[];
  fixedConditionsJa: string;
  currentWeightNoteJa: string;
  schemeRows: ForwardSymbolWeightSchemeMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalSchemeId: ForwardSymbolWeightSchemeId;
  operationalGrade: ForwardSymbolWeightAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardRegimeEnvironmentAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardRegimeEnvironmentCategoryId =
  | 'spy_trend'
  | 'volatility'
  | 'vix_band'
  | 'macro_rate'
  | 'macro_cycle'
  | 'special_period';

export type ForwardRegimeEnvironmentId =
  | 'trend_up'
  | 'trend_sideways'
  | 'trend_down'
  | 'vol_high'
  | 'vol_low'
  | 'vix_lt15'
  | 'vix_15_20'
  | 'vix_20_24'
  | 'vix_24_30'
  | 'vix_gte30'
  | 'rate_hike'
  | 'rate_cut'
  | 'expansion'
  | 'recession'
  | 'covid_crash'
  | 'bear2022'
  | 'recovery2023'
  | 'since2025';

export type ForwardRegimeEnvironmentMetrics = {
  environmentId: ForwardRegimeEnvironmentId;
  categoryId: ForwardRegimeEnvironmentCategoryId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  profitSharePct: number;
};

export type ForwardRegimeEnvironmentAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  executedTradeCount: number;
  vixDataAvailable: boolean;
  environmentRows: ForwardRegimeEnvironmentMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalGrade: ForwardRegimeEnvironmentAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMaxDrawdownAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMaxDrawdownEpisodeRow = {
  rank: number;
  startDate: string;
  troughDate: string;
  recoveryDate: string | null;
  periodDays: number;
  recoveryDays: number | null;
  depthPct: number;
  lossPctFromPeak: number;
  tradeCount: number;
};

export type ForwardMaxDrawdownClusterStats = {
  maxConsecutiveLosses: number;
  maxConsecutiveLossPct: number;
  worstStreakStartDate: string | null;
  worstStreakEndDate: string | null;
  episodeTradeCount: number;
  losingTradeCount: number;
};

export type ForwardMaxDrawdownSliceRow = {
  sliceId: string;
  labelJa: string;
  tradeCount: number;
  maxDrawdownPct: number | null;
  cumulativeLossPct: number;
  noteJa: string;
};

export type ForwardMaxDrawdownTimelinePoint = {
  date: string;
  equityPct: number;
  drawdownPct: number;
  tradeIndex: number;
  symbol: string | null;
  tradeReturnPct: number | null;
};

export type ForwardMaxDrawdownAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  executedTradeCount: number;
  portfolioMaxDrawdownPct: number;
  returnSeriesMaxDrawdownPct: number | null;
  equityCurveMaxDrawdownPct: number;
  ddRankingTop10: ForwardMaxDrawdownEpisodeRow[];
  worstEpisodeCluster: ForwardMaxDrawdownClusterStats;
  symbolDdRows: ForwardMaxDrawdownSliceRow[];
  vixDdRows: ForwardMaxDrawdownSliceRow[];
  regimeDdRows: ForwardMaxDrawdownSliceRow[];
  rateDdRows: ForwardMaxDrawdownSliceRow[];
  lotDdRows: ForwardMaxDrawdownSliceRow[];
  compoundDdRows: ForwardMaxDrawdownSliceRow[];
  recoverySummaryJa: string;
  timelinePoints: ForwardMaxDrawdownTimelinePoint[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalGrade: ForwardMaxDrawdownAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardQqqNecessityAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardQqqNecessityScenarioId =
  | 'current'
  | 'excl_qqq'
  | 'qqq_half'
  | 'replace_schd'
  | 'replace_hdv'
  | 'replace_dgro';

export type ForwardQqqNecessityScenarioMetrics = {
  scenarioId: ForwardQqqNecessityScenarioId;
  labelJa: string;
  universe: string[];
  tradeCount: number;
  qqqTradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
  profitSharePct: number;
  cumulativeDeltaVsCurrentPt: number;
};

export type ForwardQqqNecessityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  scenarioRows: ForwardQqqNecessityScenarioMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  keepQqqRecommendation: boolean;
  operationalGrade: ForwardQqqNecessityAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardLosingStreakAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardLosingStreakPolicyId =
  | 'current'
  | 'lot_half_after_2'
  | 'skip_after_2'
  | 'skip_after_3'
  | 'lot_half_after_3';

export type ForwardLosingStreakAfterMetrics = {
  afterLossStreak: number;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardLosingStreakPolicyMetrics = {
  policyId: ForwardLosingStreakPolicyId;
  labelJa: string;
  tradeCount: number;
  skippedTradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
  cumulativeDeltaVsCurrentPt: number;
};

export type ForwardLosingStreakAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  afterStreakRows: ForwardLosingStreakAfterMetrics[];
  policyRows: ForwardLosingStreakPolicyMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalPolicyId: ForwardLosingStreakPolicyId;
  operationalGrade: ForwardLosingStreakAdoptionGrade;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardDangerEnvFilterAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardDangerEnvFilterId =
  | 'current'
  | 'vix_gte30'
  | 'vix_24_30'
  | 'spy_sideways'
  | 'rate_hike'
  | 'vix24_sideways_and'
  | 'vix24_rate_and'
  | 'vix24_sideways_or';

export type ForwardDangerEnvFilterMetrics = {
  filterId: ForwardDangerEnvFilterId;
  labelJa: string;
  tradeCount: number;
  skippedTradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
  profitSharePct: number;
  cumulativeDeltaVsCurrentPt: number;
  maxDrawdownDeltaVsCurrentPt: number;
};

export type ForwardDangerEnvFilterAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  filterRows: ForwardDangerEnvFilterMetrics[];
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalFilterId: ForwardDangerEnvFilterId;
  operationalGrade: ForwardDangerEnvFilterAdoptionGrade;
  operationalNoteJa: string;
  ddReductionConclusionJa: string;
  humanSummaryJa: string;
};

export type ForwardSpySidewaysRateDirection = 'hike' | 'cut' | 'neutral';

export type ForwardSpySidewaysValidityTradeRow = {
  signalDate: string;
  entryDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  spy63Pct: number | null;
  rateDirection: ForwardSpySidewaysRateDirection;
  rateDirectionJa: string;
  bucket: string;
  sidewaysSegment: 'short_shallow' | 'long_deep' | 'other';
  executedInBaseline: boolean;
};

export type ForwardSpySidewaysValidityPhaseMetrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardSpySidewaysValiditySymbolMetrics = {
  symbol: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardSpySidewaysValidityThresholdMetrics = {
  thresholdPct: number;
  labelJa: string;
  sidewaysTradeCount: number;
  sidewaysWinRatePct: number;
  sidewaysCumulativeReturnPct: number;
  skipSimTradeCount: number;
  skipSimSkippedCount: number;
  skipSimCumulativeReturnPct: number;
  skipSimSharpe: number | null;
  skipSimMaxDrawdownPct: number | null;
  cumulativeDeltaVsBaselinePt: number;
};

export type ForwardSpySidewaysValidityCoincidenceStats = {
  baselineTradeCount: number;
  sidewaysExecutedCount: number;
  sidewaysCandidateCount: number;
  sidewaysSkippedCandidateCount: number;
  sidewaysAvgReturnPct: number | null;
  nonSidewaysAvgReturnPct: number | null;
  slotSubstitutionLikely: boolean;
  audit43CumulativeDeltaPt: number;
};

export type ForwardSpySidewaysValidityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  tradeRows: ForwardSpySidewaysValidityTradeRow[];
  sidewaysOnlyMetrics: ForwardSpySidewaysValidityPhaseMetrics;
  nonSidewaysMetrics: ForwardSpySidewaysValidityPhaseMetrics;
  shortSidewaysMetrics: ForwardSpySidewaysValidityPhaseMetrics;
  longSidewaysMetrics: ForwardSpySidewaysValidityPhaseMetrics;
  symbolRows: ForwardSpySidewaysValiditySymbolMetrics[];
  thresholdRows: ForwardSpySidewaysValidityThresholdMetrics[];
  coincidence: ForwardSpySidewaysValidityCoincidenceStats;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardRateHike2022QqqTradeRow = {
  signalDate: string;
  entryDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  spyEnvJa: string;
  rateDirectionJa: string;
};

export type ForwardRateHike2022QqqPhaseMetrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardRateHike2022QqqYearMetrics = {
  year: number;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardRateHike2022QqqLossRow = {
  rank: number;
  signalDate: string;
  entryDate: string;
  returnPct: number;
  vixAtSignal: number | null;
  spyEnvJa: string;
  rateDirectionJa: string;
  matchesHike: boolean;
  matchesVix24_30: boolean;
  matchesSideways: boolean;
};

export type ForwardRateHike2022QqqConditionId =
  | 'qqq_only'
  | 'qqq_hike'
  | 'qqq_vix24_30'
  | 'qqq_sideways'
  | 'qqq_hike_vix24'
  | 'qqq_hike_vix24_sideways';

export type ForwardRateHike2022QqqStopSimId =
  | 'stop_all_qqq'
  | 'stop_2022_qqq'
  | 'stop_qqq_hike'
  | 'stop_qqq_vix24'
  | 'stop_qqq_hike_vix24';

export type ForwardRateHike2022QqqCulpritOverlap = {
  conditionId: ForwardRateHike2022QqqConditionId;
  labelJa: string;
  tradeCount: number;
  lossTradeCount: number;
  cumulativeReturnPct: number;
};

export type ForwardRateHike2022QqqAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  trades2022: ForwardRateHike2022QqqTradeRow[];
  qqqOnlyMetrics: ForwardRateHike2022QqqPhaseMetrics;
  qqqYearRows: ForwardRateHike2022QqqYearMetrics[];
  lossRanking2022: ForwardRateHike2022QqqLossRow[];
  conditionRows: ForwardRateHike2022QqqPhaseMetrics[];
  stopSimRows: (ForwardRateHike2022QqqPhaseMetrics & {
    stopSimId: ForwardRateHike2022QqqStopSimId;
    skippedCount: number;
    cumulativeDeltaVsBaselinePt: number;
    maxDrawdownDeltaVsBaselinePt: number;
  })[];
  culpritOverlapRows: ForwardRateHike2022QqqCulpritOverlap[];
  sameCulpritConclusionJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardVixBandId =
  | 'vix_a_0_15'
  | 'vix_b_15_20'
  | 'vix_c_20_24'
  | 'vix_d_24_26'
  | 'vix_e_26_28'
  | 'vix_f_28_30'
  | 'vix_g_30_35'
  | 'vix_h_35_plus';

export type ForwardVixBandMetrics = {
  bandId: ForwardVixBandId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardVixBandSymbolMetrics = {
  symbol: string;
  bandId: ForwardVixBandId;
  bandLabelJa: string;
  tradeCount: number;
  winRatePct: number;
  cumulativeReturnPct: number;
};

export type ForwardVix2430RankingRow = {
  rank: number;
  signalDate: string;
  entryDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  subBandJa: string;
};

export type ForwardVixStopSimId =
  | 'stop_24_26'
  | 'stop_26_28'
  | 'stop_28_30'
  | 'stop_24_28'
  | 'stop_26_30'
  | 'stop_24_30'
  | 'stop_30_plus';

export type ForwardVixStopSimMetrics = ForwardVixBandMetrics & {
  stopSimId: ForwardVixStopSimId;
  skippedCount: number;
  cumulativeDeltaVsBaselinePt: number;
  maxDrawdownDeltaVsBaselinePt: number;
};

export type ForwardVixQqqSubBandMetrics = {
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardVix2430BandValidityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  bandRows: ForwardVixBandMetrics[];
  symbolBandRows: ForwardVixBandSymbolMetrics[];
  lossRanking2430: ForwardVix2430RankingRow[];
  profitRanking2430: ForwardVix2430RankingRow[];
  stopSimRows: ForwardVixStopSimMetrics[];
  qqqSubBandRows: ForwardVixQqqSubBandMetrics[];
  dangerConclusionJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardRateHikePhaseId =
  | 'pre_hike'
  | 'hike_0_3m'
  | 'hike_3_6m'
  | 'hike_6_12m'
  | 'hike_1y_plus'
  | 'cut_0_3m'
  | 'cut_3_12m'
  | 'neutral';

export type ForwardRateHikePhaseMetrics = {
  phaseId: ForwardRateHikePhaseId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardRateHikeRankingRow = {
  rank: number;
  signalDate: string;
  entryDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  phaseLabelJa: string;
  isQqq: boolean;
  isQqqVix2426: boolean;
};

export type ForwardRateHikeStopSimId =
  | 'stop_hike_0_3m'
  | 'stop_hike_6m'
  | 'stop_hike_1y'
  | 'stop_cut_0_3m'
  | 'stop_hike_0_3m_vix2426';

export type ForwardRateHikeStopSimMetrics = ForwardRateHikePhaseMetrics & {
  stopSimId: ForwardRateHikeStopSimId;
  skippedCount: number;
  cumulativeDeltaVsBaselinePt: number;
  maxDrawdownDeltaVsBaselinePt: number;
};

export type ForwardRateHikePhaseAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  phaseRows: ForwardRateHikePhaseMetrics[];
  qqqPhaseRows: ForwardRateHikePhaseMetrics[];
  qqqVix2426PhaseRows: ForwardRateHikePhaseMetrics[];
  lossRanking: ForwardRateHikeRankingRow[];
  profitRanking: ForwardRateHikeRankingRow[];
  stopSimRows: ForwardRateHikeStopSimMetrics[];
  phaseConclusionJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardQqqRiskSliceId =
  | 'all'
  | 'y2022'
  | 'hike_0_3m'
  | 'vix24_26'
  | 'hike_vix2426';

export type ForwardQqqRiskSymbolMetrics = {
  symbol: string;
  sliceId: ForwardQqqRiskSliceId;
  sliceLabelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardQqqRiskLossRow = {
  rank: number;
  signalDate: string;
  entryDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  sliceHike03Ja: string;
  isVix2426: boolean;
};

export type ForwardQqqRiskStopSimId =
  | 'stop_qqq'
  | 'stop_dgro'
  | 'stop_hdv'
  | 'stop_schd'
  | 'stop_qqq_hike_0_3m';

export type ForwardQqqRiskStopSimMetrics = {
  stopSimId: ForwardQqqRiskStopSimId;
  labelJa: string;
  tradeCount: number;
  skippedCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
  cumulativeDeltaVsBaselinePt: number;
  maxDrawdownDeltaVsBaselinePt: number;
};

export type ForwardQqqIntrinsicRiskAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  symbolSliceRows: ForwardQqqRiskSymbolMetrics[];
  lossRanking: ForwardQqqRiskLossRow[];
  stopSimRows: ForwardQqqRiskStopSimMetrics[];
  qqqOnlyDangerJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardReproMacroCycleId =
  | 'hike_2022'
  | 'cut_2020'
  | 'since_2023'
  | 'y2025_2026'
  | 'other';

export type ForwardReproCohortId = 'all' | 'qqq' | 'vix2426' | 'core';

export type ForwardReproCycleMetrics = {
  cycleId: ForwardReproMacroCycleId;
  cycleLabelJa: string;
  cohortId: ForwardReproCohortId;
  cohortLabelJa: string;
  tradeCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
};

export type ForwardReproLossRow = {
  rank: number;
  signalDate: string;
  symbol: string;
  returnPct: number;
  vixAtSignal: number | null;
  cycleLabelJa: string;
  matchesCore: boolean;
};

export type ForwardReproDdCommonFactorRow = {
  factor: string;
  valueJa: string;
  count: number;
};

export type ForwardReproStopSimId =
  | 'stop_2022_only'
  | 'stop_hike_0_3m'
  | 'stop_vix2426'
  | 'stop_2022_qqq'
  | 'stop_2022_qqq_vix2426';

export type ForwardReproStopSimMetrics = {
  stopSimId: ForwardReproStopSimId;
  labelJa: string;
  tradeCount: number;
  skippedCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  recoveryDays: number | null;
  cumulativeDeltaVsBaselinePt: number;
  maxDrawdownDeltaVsBaselinePt: number;
};

export type ForwardReproducibilityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  cycleRows: ForwardReproCycleMetrics[];
  lossRanking: ForwardReproLossRow[];
  ddCommonFactors: ForwardReproDdCommonFactorRow[];
  maxDdEpisodeJa: string;
  stopSimRows: ForwardReproStopSimMetrics[];
  reproducibilityConclusionJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type Forward2022RootCauseMetricId =
  | 'ndx_dist52'
  | 'qqq_ma200_dev'
  | 'spy_dist52'
  | 'vix'
  | 'vix_wow'
  | 'vix_mom'
  | 'us10y'
  | 'us10y_wow'
  | 'hike_days'
  | 'cpi_yoy'
  | 'spy_sideways'
  | 'adx';

export type Forward2022RootCauseCohortId =
  | 'y2022_loss'
  | 'cut2020_win'
  | 'y2025_win';

export type Forward2022RootCauseTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  cohortId: Forward2022RootCauseCohortId | 'y2022_other';
  ndxDist52Pct: number | null;
  qqqMa200DevPct: number | null;
  spyDist52Pct: number | null;
  vix: number | null;
  vixWowPct: number | null;
  vixMomPct: number | null;
  us10yPct: number | null;
  us10yWowPct: number | null;
  hikeDaysFromStart: number | null;
  cpiYoyPct: number | null;
  spySideways: boolean;
  adx14: number;
  ratePhaseJa: string;
  matchesCoreDanger: boolean;
  focusTrade: boolean;
};

export type Forward2022RootCauseCompareRow = {
  metricId: Forward2022RootCauseMetricId;
  labelJa: string;
  unit: string;
  y2022LossAvg: number | null;
  cut2020WinAvg: number | null;
  y2025WinAvg: number | null;
  deltaLossMinusCutWin: number | null;
  deltaLossMinusY2025Win: number | null;
};

export type Forward2022RootCauseCorrelationRow = {
  rank: number;
  metricId: Forward2022RootCauseMetricId;
  labelJa: string;
  correlation: number | null;
  absCorrelation: number | null;
};

export type Forward2022RootCauseStopSimId =
  | 'stop_ndx_dist15'
  | 'stop_ndx_dist20'
  | 'stop_vix_mom30'
  | 'stop_us10y_spike'
  | 'stop_qqq_below_ma200'
  | 'stop_hike03_qqq_vix2426'
  | 'stop_spy_dist10'
  | 'stop_vix2426_qqq';

export type Forward2022RootCauseStopSimMetrics = {
  stopSimId: Forward2022RootCauseStopSimId;
  labelJa: string;
  tradeCount: number;
  skippedCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  mar: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  cumulativeDeltaVsBaselinePt: number;
  maxDrawdownDeltaVsBaselinePt: number;
};

export type Forward2022RootCauseAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  tnxDataAvailable: boolean;
  y2022TradeCount: number;
  lossTop5: Forward2022RootCauseTradeRow[];
  winTop10: Forward2022RootCauseTradeRow[];
  compareRows: Forward2022RootCauseCompareRow[];
  correlationRanking: Forward2022RootCauseCorrelationRow[];
  stopSimRows: Forward2022RootCauseStopSimMetrics[];
  rootCauseConclusionJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardOverfitPeriodId =
  | 'a_2018_2020'
  | 'b_2021_2023'
  | 'c_2024_2026'
  | 'full';

export type ForwardOverfitAdoptionGrade = 'A' | 'B' | 'C';

export type ForwardOverfitRuleMetrics = {
  ruleId: 'current' | 'candidate';
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  coreSkipCount: number;
  coreHitCount: number;
};

export type ForwardOverfitPeriodRow = {
  periodId: ForwardOverfitPeriodId;
  periodLabelJa: string;
  fromDate: string;
  toDate: string;
  current: ForwardOverfitRuleMetrics;
  candidate: ForwardOverfitRuleMetrics;
  deltaCumulativePt: number;
  deltaMaxDrawdownPt: number;
  deltaSharpe: number | null;
  candidateBetter: boolean;
};

export type ForwardOverfitSimulationSummary = {
  runs: number;
  candidateWinRatePct: number;
  meanDeltaCumulativePt: number;
  medianDeltaCumulativePt: number;
  ci95LowDeltaPt: number;
  ci95HighDeltaPt: number;
  pValuePct: number;
};

export type ForwardOverfitAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  candidateRuleJa: string;
  vixDataAvailable: boolean;
  coreCandidateCount: number;
  coreExecutedCount: number;
  periodRows: ForwardOverfitPeriodRow[];
  monteCarlo: ForwardOverfitSimulationSummary;
  bootstrap: ForwardOverfitSimulationSummary;
  adoptionGrade: ForwardOverfitAdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardWinFactorMetricId =
  | 'ndx_dist52'
  | 'spy_dist52'
  | 'qqq_ma200_dev'
  | 'vix'
  | 'vix_mom'
  | 'us10y'
  | 'hike_days'
  | 'cpi_yoy'
  | 'spy_sideways'
  | 'adx';

export type ForwardWinFactorCohortId = 'y2020' | 'y2022' | 'y2025_2026' | 'full';

export type ForwardWinFactorAdoptionGrade = 'A' | 'B' | 'C';

export type ForwardWinFactorClusterId =
  | 'deep_pullback'
  | 'cut_cycle'
  | 'high_vix_reversal'
  | 'high_adx_trend'
  | 'hike_recovery'
  | 'shallow_sideways'
  | 'ma200_uptrend'
  | 'other';

export type ForwardWinFactorTradeRow = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  isWin: boolean;
  cohortId: ForwardWinFactorCohortId;
  ndxDist52Pct: number | null;
  spyDist52Pct: number | null;
  qqqMa200DevPct: number | null;
  vix: number | null;
  vixMomPct: number | null;
  us10yPct: number | null;
  hikeDaysFromStart: number | null;
  cpiYoyPct: number | null;
  spySideways: boolean;
  adx14: number;
  clusterId: ForwardWinFactorClusterId;
  clusterLabelJa: string;
};

export type ForwardWinFactorCompareRow = {
  metricId: ForwardWinFactorMetricId;
  labelJa: string;
  winTop20Avg: number | null;
  lossTop20Avg: number | null;
  deltaWinMinusLoss: number | null;
};

export type ForwardWinFactorCorrelationRow = {
  metricId: ForwardWinFactorMetricId;
  labelJa: string;
  corrReturn: number | null;
  corrWinRate: number | null;
  corrProfitFactor: number | null;
  absReturnRank: number;
};

export type ForwardWinFactorClusterRow = {
  clusterId: ForwardWinFactorClusterId;
  labelJa: string;
  winCount: number;
  sharePct: number;
  avgReturnPct: number | null;
  avgVix: number | null;
  avgNdxDist52: number | null;
  avgAdx: number | null;
};

export type ForwardWinFactorKeepSimId =
  | 'keep_deep_ndx15'
  | 'keep_high_vix30'
  | 'keep_cut_phase'
  | 'keep_adx30'
  | 'keep_spy_deep10'
  | 'keep_winner_median';

export type ForwardWinFactorKeepSimMetrics = {
  keepSimId: ForwardWinFactorKeepSimId;
  labelJa: string;
  tradeCount: number;
  skippedCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  cumulativeDeltaVsBaselinePt: number;
};

export type ForwardWinFactorCohortSummary = {
  cohortId: ForwardWinFactorCohortId;
  labelJa: string;
  winCount: number;
  lossCount: number;
  winRatePct: number;
};

export type ForwardWinFactorAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  vixDataAvailable: boolean;
  tnxDataAvailable: boolean;
  cohortSummaries: ForwardWinFactorCohortSummary[];
  winTop20: ForwardWinFactorTradeRow[];
  lossTop20: ForwardWinFactorTradeRow[];
  compareRows: ForwardWinFactorCompareRow[];
  correlationRanking: ForwardWinFactorCorrelationRow[];
  clusterRows: ForwardWinFactorClusterRow[];
  keepSimRows: ForwardWinFactorKeepSimMetrics[];
  profitFactorRankingJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardDurabilityStressId =
  | 'cost_2x'
  | 'cost_3x'
  | 'slip_05'
  | 'slip_10'
  | 'slip_20'
  | 'win_rate_m5'
  | 'win_rate_m10'
  | 'return_m10'
  | 'return_m20'
  | 'return_m30';

export type ForwardDurabilityCapitalModeId =
  | 'fixed'
  | 'compound'
  | 'kelly_25'
  | 'kelly_50'
  | 'kelly_100';

export type ForwardDurabilityOperationalGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardDurabilityStressMetrics = {
  stressId: ForwardDurabilityStressId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  finalEquityMYR: number;
  deltaCumulativeVsBaselinePt: number;
};

export type ForwardDurabilityMcSummary = {
  runs: number;
  meanCumulativePct: number;
  medianCumulativePct: number;
  ci95LowPct: number;
  ci95HighPct: number;
  worstCumulativePct: number;
  worstMaxDrawdownPct: number;
  meanSharpe: number | null;
  meanProfitFactor: number | null;
  bankruptcyRatePct: number;
};

export type ForwardDurabilityCapitalMetrics = {
  modeId: ForwardDurabilityCapitalModeId;
  labelJa: string;
  finalEquityMYR: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number | null;
  sharpe: number | null;
  profitFactor: number | null;
  minEquityPct: number;
  avgSlotMYR: number | null;
};

export type ForwardDurabilityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselineTradeCount: number;
  stressRows: ForwardDurabilityStressMetrics[];
  monteCarlo: ForwardDurabilityMcSummary;
  capitalRows: ForwardDurabilityCapitalMetrics[];
  operationalGrade: ForwardDurabilityOperationalGrade;
  operationalVerdictJa: string;
  rm3000RecommendationJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  operationalNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardCompleteOosTrustGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardCompleteOosSplitId = 'holdout_a' | 'holdout_b';

export type ForwardCompleteOosSplitRow = {
  splitId: ForwardCompleteOosSplitId;
  labelJa: string;
  trainFrom: string;
  trainTo: string;
  testFrom: string;
  testTo: string;
  train: ForwardWalkForward31PhaseMetrics;
  test: ForwardWalkForward31PhaseMetrics;
};

export type ForwardCompleteOosYearRow = {
  year: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardCompleteOosAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  totalTradeCount: number;
  splitRows: ForwardCompleteOosSplitRow[];
  foldRows: ForwardWalkForward31FoldRow[];
  yearRows: ForwardCompleteOosYearRow[];
  worstYear: ForwardCompleteOosYearRow | null;
  bestYear: ForwardCompleteOosYearRow | null;
  year2026: ForwardCompleteOosYearRow | null;
  aggregateOosTest: ForwardWalkForward31PhaseMetrics;
  trustGrade: ForwardCompleteOosTrustGrade;
  trustScore: number;
  trustVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardAnomalySafetyGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardAnomalyCaseId =
  | 'api_stock_fail'
  | 'api_news_fail'
  | 'api_openai_fail'
  | 'data_prev_close_missing'
  | 'data_volume_missing'
  | 'data_earnings_missing'
  | 'price_zero'
  | 'price_negative'
  | 'price_spike_100'
  | 'price_drop_90'
  | 'comm_timeout'
  | 'comm_429'
  | 'comm_500'
  | 'comm_502'
  | 'comm_503'
  | 'pf_zero_holdings'
  | 'pf_duplicate'
  | 'pf_negative_shares'
  | 'pf_zero_avg_cost'
  | 'conc_refresh_spam'
  | 'conc_notification_spam'
  | 'conc_screen_switch';

export type ForwardAnomalyCaseSeverity = 'pass' | 'warn' | 'fail';

export type ForwardAnomalyCaseResult = {
  caseId: ForwardAnomalyCaseId;
  categoryJa: string;
  labelJa: string;
  crashBlocked: boolean;
  erroneousOrderBlocked: boolean;
  dataLossBlocked: boolean;
  uiFreezeBlocked: boolean;
  recoverable: boolean;
  guardModuleJa: string;
  severity: ForwardAnomalyCaseSeverity;
  noteJa: string;
};

export type ForwardAnomalyResilienceAuditReport = {
  auditedAt: string;
  fixedConditionsJa: string;
  caseRows: ForwardAnomalyCaseResult[];
  passCount: number;
  warnCount: number;
  failCount: number;
  safetyGrade: ForwardAnomalySafetyGrade;
  safetyScore: number;
  safetyVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMarketChangeSurvivalGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMarketChangeScenarioId =
  | 'ultra_low_vol'
  | 'ultra_high_vol'
  | 'high_rate_6'
  | 'cut_cycle_6m'
  | 'inflation_8'
  | 'deflation'
  | 'ai_bubble'
  | 'lehman_crash'
  | 'covid_v'
  | 'sideways_hell';

export type ForwardMarketChangeScenarioMetrics = {
  scenarioId: ForwardMarketChangeScenarioId;
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
  proxyJa: string;
  collapsed: boolean;
  ruleIdle: boolean;
};

export type ForwardMarketChangeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  scenarioRows: ForwardMarketChangeScenarioMetrics[];
  survivalGrade: ForwardMarketChangeSurvivalGrade;
  resilienceScore: number;
  resilienceVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardLehmanFixGrade = 'A' | 'B' | 'C';

export type ForwardLehmanCauseId =
  | 'vix'
  | 'rate'
  | 'ndx_dev'
  | 'cpi'
  | 'entry_freq'
  | 'position_size';

export type ForwardLehmanLossRow = {
  rank: number;
  signalDate: string;
  symbol: string;
  returnPct: number;
  vix: number | null;
  qqqMa200DevPct: number | null;
  ratePhaseJa: string;
  ndxDist52Pct: number | null;
  cpiYoyPct: number | null;
  matchesCoreDanger: boolean;
};

export type ForwardLehmanCauseRankRow = {
  causeId: ForwardLehmanCauseId;
  labelJa: string;
  rank: number;
  lossSharePct: number;
  hitCount: number;
  noteJa: string;
};

export type ForwardLehmanCommonFactorRow = {
  factorJa: string;
  hitCount: number;
  hitRatePct: number;
};

export type ForwardLehmanCounterfactualMetrics = {
  labelJa: string;
  avoidConditionJa: string;
  skippedCount: number;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cumulativeReturnPct: number;
};

export type ForwardLehmanBreakdownAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  scenarioLabelJa: string;
  baselineCumulativePct: number;
  baselineMaxDrawdownPct: number | null;
  lossRows: ForwardLehmanLossRow[];
  commonFactorRows: ForwardLehmanCommonFactorRow[];
  causeRankRows: ForwardLehmanCauseRankRow[];
  baselineMetrics: ForwardLehmanCounterfactualMetrics;
  counterfactualMetrics: ForwardLehmanCounterfactualMetrics;
  fixGrade: ForwardLehmanFixGrade;
  fixVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardLehmanLotSchemeId =
  | 'rm700_current'
  | 'rm500'
  | 'rm400'
  | 'pct20'
  | 'pct15'
  | 'kelly25';

export type ForwardLehmanLotAdoptionGrade = 'A' | 'B' | 'C';

export type ForwardLehmanLotSchemeMetrics = {
  schemeId: ForwardLehmanLotSchemeId;
  labelJa: string;
  lotMYR: number | null;
  deployPct: number | null;
  kellyFraction: number | null;
  tradeCount: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  bankruptcyRatePct: number;
  minEquityPct: number;
  finalEquityMYR: number;
  avgSlotMYR: number;
};

export type ForwardLehmanLotAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  scenarioLabelJa: string;
  referenceCapitalMYR: number;
  lehmanTradeCount: number;
  audit57BaselineCumulativePct: number;
  audit57BaselineMaxDrawdownPct: number | null;
  schemeRows: ForwardLehmanLotSchemeMetrics[];
  adoptionGrade: ForwardLehmanLotAdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardDynamicLotSchemeId = 'rm700_current' | 'kelly25_fixed' | 'dynamic_switch';

export type ForwardDynamicLotAdoptionGrade = 'A' | 'B' | 'C';

export type ForwardDynamicLotScopeId = 'full_history' | 'lehman_scenario';

export type ForwardDynamicLotSchemeMetrics = {
  schemeId: ForwardDynamicLotSchemeId;
  scopeId: ForwardDynamicLotScopeId;
  labelJa: string;
  tradeCount: number;
  kellyTriggerCount: number | null;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  bankruptcyRatePct: number;
  minEquityPct: number;
  finalEquityMYR: number;
  avgSlotMYR: number;
};

export type ForwardDynamicLotAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  switchConditionJa: string;
  referenceCapitalMYR: number;
  fullHistoryTradeCount: number;
  lehmanTradeCount: number;
  schemeRows: ForwardDynamicLotSchemeMetrics[];
  adoptionGrade: ForwardDynamicLotAdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardKellyTriggerPresetId = 'current' | 'strict' | 'ultra_strict';

export type ForwardKellyTriggerAdoptionGrade = 'A' | 'B' | 'C';

export type ForwardKellyTriggerPresetMetrics = {
  presetId: ForwardKellyTriggerPresetId;
  labelJa: string;
  conditionJa: string;
  vixMin: number;
  qqqMa200ThresholdPct: number;
  ndx52wThresholdPct: number;
  tradeCount: number;
  kellyTriggerCount: number;
  kellyTriggerRatePct: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  bankruptcyRatePct: number;
  minEquityPct: number;
  finalEquityMYR: number;
  avgSlotMYR: number;
  deltaCumulativeVsRm700Pt: number;
  deltaMaxDDVsRm700Pt: number;
  deltaSharpeVsRm700: number | null;
  inTargetTriggerBand: boolean;
};

export type ForwardKellyTriggerRm700Baseline = {
  tradeCount: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  bankruptcyRatePct: number;
  finalEquityMYR: number;
};

export type ForwardKellyTriggerAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  referenceCapitalMYR: number;
  fullHistoryTradeCount: number;
  targetTriggerRateLowPct: number;
  targetTriggerRateHighPct: number;
  rm700Baseline: ForwardKellyTriggerRm700Baseline;
  presetRows: ForwardKellyTriggerPresetMetrics[];
  optimalPresetId: ForwardKellyTriggerPresetId | null;
  adoptionGrade: ForwardKellyTriggerAdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMcDurabilityOperationalGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMcDurabilitySummary = {
  runs: number;
  meanCumulativePct: number;
  medianCumulativePct: number;
  worstCumulativePct: number;
  p5CumulativePct: number;
  p1CumulativePct: number;
  meanMaxDrawdownPct: number;
  worstMaxDrawdownPct: number;
  bankruptcyRatePct: number;
  bankruptCount: number;
};

export type ForwardMcDurabilityBaseline = {
  tradeCount: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  minEquityPct: number;
  finalEquityMYR: number;
};

export type ForwardMcDurabilityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  strategyLabelJa: string;
  referenceCapitalMYR: number;
  lotPerSlotMYR: number;
  tradeCount: number;
  baseline: ForwardMcDurabilityBaseline;
  monteCarlo: ForwardMcDurabilitySummary;
  operationalGrade: ForwardMcDurabilityOperationalGrade;
  operationalVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardBootstrapMcOperationalGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardBootstrapMcCapitalId = 'rm3000' | 'rm2000' | 'rm1500' | 'rm1000';

export type ForwardBootstrapMcSummary = {
  runs: number;
  sampleSize: number;
  meanCumulativePct: number;
  medianCumulativePct: number;
  worstCumulativePct: number;
  p5CumulativePct: number;
  p1CumulativePct: number;
  meanMaxDrawdownPct: number;
  worstMaxDrawdownPct: number;
  bankruptcyRatePct: number;
  bankruptCount: number;
};

export type ForwardBootstrapMcCapitalRow = {
  capitalId: ForwardBootstrapMcCapitalId;
  capitalMYR: number;
  labelJa: string;
  metrics: ForwardBootstrapMcSummary;
};

export type ForwardBootstrapMcAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  strategyLabelJa: string;
  lotPerSlotMYR: number;
  poolTradeCount: number;
  bootstrapRuns: number;
  capitalRows: ForwardBootstrapMcCapitalRow[];
  minimumSafeCapitalMYR: number;
  operationalGrade: ForwardBootstrapMcOperationalGrade;
  operationalVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardWf7030OosAdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardWf7030OosSplit = {
  trainFrom: string;
  trainTo: string;
  testFrom: string;
  testTo: string;
  trainPct: number;
  testPct: number;
};

export type ForwardWf7030OosAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  split: ForwardWf7030OosSplit;
  train: ForwardWalkForward31PhaseMetrics;
  test: ForwardWalkForward31PhaseMetrics;
  cumulativeDegradationPct: number | null;
  winRateDegradationPct: number | null;
  sharpeDegradationPct: number | null;
  maxDrawdownDegradationPct: number | null;
  overfitVerdictJa: string;
  adoptionGrade: ForwardWf7030OosAdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMacdDist52ClusterMacroAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  cohortTradeCount: number;
  clusterMonths: string[];
  vixDataAvailable: boolean;
  cluster: ForwardMacdDist52ClusterMacroGroupStats;
  other: ForwardMacdDist52ClusterMacroGroupStats;
  comparisons: ForwardMacdDist52ClusterMacroCompareRow[];
  insightJa: string;
  humanSummaryJa: string;
};

export type ForwardMacdDist52DedupExclSpringAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  cohortLabelJa: string;
  excludeMonths: string[];
  totalEventCount: number;
  excludedEventCount: number;
  remainingEventCount: number;
  full: ForwardMacdDist52DedupExclSpringMetrics;
  excluded: ForwardMacdDist52DedupExclSpringMetrics;
  remaining: ForwardMacdDist52DedupExclSpringMetrics;
  remainingTimeline: ForwardMacdDist52DedupTimelineRow[];
  humanSummaryJa: string;
};

export type ForwardMacdCumulativePoint = {
  signalDate: string;
  symbol: string;
  returnPct: number;
  cumulativeReturnPct: number;
  periodId: ForwardStandalonePeriodId | null;
  periodCumulativeReturnPct: number;
};

export type ForwardMacdCumulativePeriodSummary = {
  periodId: ForwardStandalonePeriodId;
  periodLabelJa: string;
  fromDate: string;
  toDate: string;
  tradeCount: number;
  cumulativeReturnPct: number;
};

export type ForwardMacdCumulativeAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  filterLabelJa: string;
  cohortTradeCount: number;
  macdThreshold: number;
  finalCumulativeReturnPct: number;
  curve: ForwardMacdCumulativePoint[];
  periodSummaries: ForwardMacdCumulativePeriodSummary[];
  humanSummaryJa: string;
};

export type ForwardMacdExclSpringSnapshot = {
  labelJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  avgReturnPct: number | null;
  sharpe: number | null;
  maxHoldRatePct: number;
};

export type ForwardMacdExclSpringAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  totalTrades: number;
  filterLabelJa: string;
  macdThreshold: number;
  excludeMonths: string[];
  macdCohortCount: number;
  excludedCount: number;
  remainingCount: number;
  full: ForwardMacdExclSpringSnapshot;
  excluded: ForwardMacdExclSpringSnapshot;
  remaining: ForwardMacdExclSpringSnapshot;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV1SymbolGrade = 'S' | 'A' | 'B' | 'C';

export type ForwardMalaysiaV1SymbolMetrics = {
  symbol: string;
  nameJa: string;
  yahooSymbol: string;
  fromDate: string;
  toDate: string;
  years: number;
  tradeCount: number;
  totalReturnPct: number;
  totalReturnWithDividendPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  dividendYieldPct: number | null;
  volatilityPct: number | null;
  avgDailyVolume: number | null;
  grade: ForwardMalaysiaV1SymbolGrade;
  gradeJa: string;
};

export type ForwardMalaysiaV1PortfolioRow = {
  size: number;
  symbols: string[];
  labelJa: string;
  tradeCount: number;
  cumulativeReturnPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  mar: number | null;
};

export type ForwardMalaysiaV1UsCompareRow = {
  dimensionJa: string;
  usValueJa: string;
  myValueJa: string;
  winner: 'US' | 'MY' | 'tie';
};

export type ForwardMalaysiaV1HybridRow = {
  usWeightPct: number;
  myWeightPct: number;
  labelJa: string;
  usCumulativePct: number;
  myCumulativePct: number;
  combinedCumulativePct: number;
  combinedSharpe: number | null;
  combinedMaxDrawdownPct: number | null;
};

export type ForwardMalaysiaV1Rm3000Plan = {
  variantJa: string;
  recommendedLotMYR: number;
  expectedReturnPct: number;
  expectedMaxDrawdownPct: number;
  bankruptcyRatePct: number;
  noteJa: string;
};

export type ForwardMalaysiaV1AdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV1AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  usFixedConditionsJa: string;
  malaysiaFixedConditionsJa: string;
  symbolRows: ForwardMalaysiaV1SymbolMetrics[];
  bestPortfolioBySize: ForwardMalaysiaV1PortfolioRow[];
  usBaseline: ForwardMalaysiaV1PortfolioRow;
  usCompareRows: ForwardMalaysiaV1UsCompareRow[];
  hybridRows: ForwardMalaysiaV1HybridRow[];
  rm3000Plans: ForwardMalaysiaV1Rm3000Plan[];
  adoptionGrade: ForwardMalaysiaV1AdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV2AdoptionGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV2ScenarioId =
  | 'baseline_v1'
  | 'ex_ytl'
  | 'ex_99'
  | 'ex_both'
  | 'sector_equal';

export type ForwardMalaysiaV2BootstrapSummary = {
  runs: number;
  bankruptcyRatePct: number;
  meanCumulativePct: number;
  p5CumulativePct: number;
  worstMaxDrawdownPct: number;
};

export type ForwardMalaysiaV2WfOosSummary = {
  trainCumulativePct: number;
  testCumulativePct: number;
  cumulativeDegradationPct: number | null;
  testWinRatePct: number;
  overfitVerdictJa: string;
};

export type ForwardMalaysiaV2ScenarioRow = {
  scenarioId: ForwardMalaysiaV2ScenarioId;
  labelJa: string;
  symbols: string[];
  tradeCount: number;
  cumulativeReturnPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  bootstrap: ForwardMalaysiaV2BootstrapSummary;
  wfOos: ForwardMalaysiaV2WfOosSummary;
};

export type ForwardMalaysiaV2AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  v1BaselineSymbols: string[];
  scenarios: ForwardMalaysiaV2ScenarioRow[];
  recommendedScenarioId: ForwardMalaysiaV2ScenarioId;
  ytlDependencyPct: number | null;
  adoptionGrade: ForwardMalaysiaV2AdoptionGrade;
  adoptionVerdictJa: string;
  answer1Ja: string;
  answer2Ja: string;
  answer3Ja: string;
  answer4Ja: string;
  answer5Ja: string;
  answer6Ja: string;
  answer7Ja: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV2DurabilityGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV2DurabilityCompareId =
  | 'my_v1'
  | 'my_v2'
  | 'us'
  | 'hybrid_50_50'
  | 'hybrid_30_70';

export type ForwardMalaysiaV2DurabilityMetrics = {
  tradeCount: number;
  cumulativeReturnPct: number;
  cumulativeWithDividendPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
};

export type ForwardMalaysiaV2DurabilityBootstrap = {
  runs: number;
  bankruptcyRatePct: number;
  meanCumulativePct: number;
  medianCumulativePct: number;
  p5CumulativePct: number;
  p1CumulativePct: number;
  worstCumulativePct: number;
  worstMaxDrawdownPct: number;
};

export type ForwardMalaysiaV2DurabilityWfSplit = {
  trainPct: number;
  testPct: number;
  train: ForwardMalaysiaV2DurabilityMetrics;
  test: ForwardMalaysiaV2DurabilityMetrics;
  cumulativeDegradationPct: number | null;
  overfitVerdictJa: string;
};

export type ForwardMalaysiaV2DurabilityCompareRow = {
  compareId: ForwardMalaysiaV2DurabilityCompareId;
  labelJa: string;
  symbols: string[];
  metrics: ForwardMalaysiaV2DurabilityMetrics;
  bootstrap: ForwardMalaysiaV2DurabilityBootstrap;
};

export type ForwardMalaysiaV2DurabilityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  v2Symbols: string[];
  v2Metrics: ForwardMalaysiaV2DurabilityMetrics;
  v2Bootstrap: ForwardMalaysiaV2DurabilityBootstrap;
  wf6040: ForwardMalaysiaV2DurabilityWfSplit;
  wf8020: ForwardMalaysiaV2DurabilityWfSplit;
  covidPhase: ForwardMalaysiaV2DurabilityMetrics;
  highRatePhase: ForwardMalaysiaV2DurabilityMetrics;
  worstCaseRm3000: {
    cumulativeReturnPct: number;
    maxDrawdownPct: number;
    finalEquityMYR: number;
    noteJa: string;
  };
  symbolDependencyPct: Record<string, number>;
  liquidityRiskJa: string;
  compareRows: ForwardMalaysiaV2DurabilityCompareRow[];
  recommendedLotMYR: number;
  additionalCandidatesJa: string;
  adoptionGrade: ForwardMalaysiaV2DurabilityGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV2DiversificationPatternId = 'p2' | 'p3_cimb' | 'p3_ihh' | 'p4';

export type ForwardMalaysiaV2DiversificationGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV2DiversificationPatternRow = {
  patternId: ForwardMalaysiaV2DiversificationPatternId;
  labelJa: string;
  symbols: string[];
  tradeCount: number;
  cumulativeReturnPct: number;
  cumulativeWithDividendPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  bootstrap: {
    runs: number;
    bankruptcyRatePct: number;
    p5CumulativePct: number;
    worstCumulativePct: number;
    worstMaxDrawdownPct: number;
  };
  wfOos: {
    trainCumulativePct: number;
    testCumulativePct: number;
    cumulativeDegradationPct: number | null;
    overfitVerdictJa: string;
  };
  symbolDependencyPct: Record<string, number>;
  maxSingleDependencyPct: number;
};

export type ForwardMalaysiaV2DiversificationAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselineDependencyPct: Record<string, number>;
  patterns: ForwardMalaysiaV2DiversificationPatternRow[];
  bestSharpePatternId: ForwardMalaysiaV2DiversificationPatternId;
  bestMaxDdPatternId: ForwardMalaysiaV2DiversificationPatternId;
  bestStabilityPatternId: ForwardMalaysiaV2DiversificationPatternId;
  bestGrowthPatternId: ForwardMalaysiaV2DiversificationPatternId;
  recommendedPatternId: ForwardMalaysiaV2DiversificationPatternId;
  dependencyUnder50Pct: boolean;
  adoptionGrade: ForwardMalaysiaV2DiversificationGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV2WeightPatternId =
  | 'w33_33_33'
  | 'w20_60_20'
  | 'w15_70_15'
  | 'w25_50_25'
  | 'w10_80_10'
  | 'w40_40_20'
  | 'w40_50_10';

export type ForwardMalaysiaV2WeightGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV2WeightPatternRow = {
  patternId: ForwardMalaysiaV2WeightPatternId;
  labelJa: string;
  weights: Record<string, number>;
  weightLabelJa: string;
  tradeCount: number;
  cumulativeReturnPct: number;
  cumulativeWithDividendPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  bootstrap: {
    runs: number;
    bankruptcyRatePct: number;
    p5CumulativePct: number;
    worstCumulativePct: number;
    worstMaxDrawdownPct: number;
  };
  wfOos: {
    trainCumulativePct: number;
    testCumulativePct: number;
    cumulativeDegradationPct: number | null;
    overfitVerdictJa: string;
  };
  symbolDependencyPct: Record<string, number>;
  maxSingleDependencyPct: number;
};

export type ForwardMalaysiaV2WeightAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselinePatternId: ForwardMalaysiaV2WeightPatternId;
  baselineDependencyPct: Record<string, number>;
  patterns: ForwardMalaysiaV2WeightPatternRow[];
  bestSharpePatternId: ForwardMalaysiaV2WeightPatternId;
  bestCumulativePatternId: ForwardMalaysiaV2WeightPatternId;
  bestMaxDdPatternId: ForwardMalaysiaV2WeightPatternId;
  recommendedPatternId: ForwardMalaysiaV2WeightPatternId;
  adoptedPatternId: ForwardMalaysiaV2WeightPatternId;
  dependencyUnder60Pct: boolean;
  adoptionGrade: ForwardMalaysiaV2WeightGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV21FourthCandidateId =
  | 'baseline_v21'
  | 'c_maybank'
  | 'c_public'
  | 'c_axiata'
  | 'c_celcomdigi'
  | 'c_sunway'
  | 'c_kpj'
  | 'c_ihh'
  | 'c_misc'
  | 'c_ytl'
  | 'c_99sm';

export type ForwardMalaysiaV21FourthGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV21FourthCandidateRow = {
  candidateId: ForwardMalaysiaV21FourthCandidateId;
  labelJa: string;
  sectorJa: string;
  addedSymbol: string | null;
  symbols: string[];
  tradeCount: number;
  avgCorrelationWithBase: number | null;
  gamudaCorrelation: number | null;
  cumulativeReturnPct: number;
  cumulativeWithDividendPct: number;
  winRatePct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number | null;
  cagr: number | null;
  bootstrap: {
    runs: number;
    bankruptcyRatePct: number;
    p5CumulativePct: number;
    worstCumulativePct: number;
    worstMaxDrawdownPct: number;
  };
  wfOos: {
    trainCumulativePct: number;
    testCumulativePct: number;
    cumulativeDegradationPct: number | null;
    overfitVerdictJa: string;
  };
  symbolDependencyPct: Record<string, number>;
  maxSingleDependencyPct: number;
  fetchOk: boolean;
};

export type ForwardMalaysiaV21FourthSymbolAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baseSymbols: string[];
  candidates: ForwardMalaysiaV21FourthCandidateRow[];
  bestAddCandidateId: ForwardMalaysiaV21FourthCandidateId;
  lowestCorrelationCandidateId: ForwardMalaysiaV21FourthCandidateId;
  recommendedFourSymbolId: ForwardMalaysiaV21FourthCandidateId;
  rm3000CompositionId: ForwardMalaysiaV21FourthCandidateId;
  rm10000CompositionId: ForwardMalaysiaV21FourthCandidateId;
  dependencyUnder50Pct: boolean;
  adoptionGrade: ForwardMalaysiaV21FourthGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3DcaPlanId =
  | 'lump_sum'
  | 'dca_500'
  | 'dca_1000'
  | 'dca_1500';

export type ForwardMalaysiaV3YtlTimingId = 't_10000' | 't_15000' | 't_20000' | 't_immediate';

export type ForwardMalaysiaV3Grade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV3DcaPlanRow = {
  planId: ForwardMalaysiaV3DcaPlanId;
  labelJa: string;
  monthlyContributionMYR: number;
  initialCapitalMYR: number;
  totalContributedMYR: number;
  finalEquityMYR: number;
  equityAt1yr: number;
  equityAt3yr: number;
  equityAt5yr: number;
  maxDrawdownPct: number;
  cagr: number | null;
  sharpe: number | null;
  monthsToRm10000: number | null;
  monthsToRm30000: number | null;
  monthsToRm100000: number | null;
  ytlAddedMonth: number | null;
  ytlAddedDate: string | null;
  bootstrap: {
    runs: number;
    bankruptcyRatePct: number;
    p5FinalEquityMYR: number;
    worstFinalEquityMYR: number;
    worstMaxDrawdownPct: number;
  };
  wfOos: {
    testFinalEquityMYR: number;
    testContributedMYR: number;
    testReturnPct: number;
    overfitVerdictJa: string;
  };
};

export type ForwardMalaysiaV3YtlTimingRow = {
  timingId: ForwardMalaysiaV3YtlTimingId;
  labelJa: string;
  ytlThresholdMYR: number;
  monthlyContributionMYR: number;
  monthsToRm10000: number | null;
  monthsToRm100000: number | null;
  maxDrawdownPct: number;
  finalEquityMYR: number;
};

export type ForwardMalaysiaV3DcaAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  lumpSumVsDcaNoteJa: string;
  plans: ForwardMalaysiaV3DcaPlanRow[];
  ytlTimings: ForwardMalaysiaV3YtlTimingRow[];
  bestDcaPlanId: ForwardMalaysiaV3DcaPlanId;
  optimalYtlTimingId: ForwardMalaysiaV3YtlTimingId;
  adoptionGrade: ForwardMalaysiaV3Grade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3CrashScenarioId =
  | 'baseline'
  | 'crisis_2008'
  | 'crisis_2020'
  | 'crisis_2022'
  | 'single_minus50'
  | 'single_delist'
  | 'gamuda_minus70'
  | 'ytl_minus70'
  | 'cimb_minus50'
  | 'tenaga_minus50'
  | 'triple_crash';

export type ForwardMalaysiaV3CrashGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV3CrashScenarioRow = {
  scenarioId: ForwardMalaysiaV3CrashScenarioId;
  labelJa: string;
  cashReservePct: number;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  minEquityMYR: number;
  finalEquityMYR: number;
  totalContributedMYR: number;
  monthsToRm10000: number | null;
  monthsToRm100000: number | null;
  bootstrap: {
    runs: number;
    bankruptcyRatePct: number;
    p5MinEquityMYR: number;
    worstMinEquityMYR: number;
  };
  survived: boolean;
};

export type ForwardMalaysiaV3CashCompareRow = {
  cashReservePct: number;
  labelJa: string;
  worstScenarioId: ForwardMalaysiaV3CrashScenarioId;
  minEquityMYR: number;
  maxDrawdownPct: number;
  bankruptcyRatePct: number;
  monthsToRm100000: number | null;
};

export type ForwardMalaysiaV3CrashAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  monthlyContributionMYR: number;
  scenarios: ForwardMalaysiaV3CrashScenarioRow[];
  cashCompare: ForwardMalaysiaV3CashCompareRow[];
  worstScenarioId: ForwardMalaysiaV3CrashScenarioId;
  adoptionGrade: ForwardMalaysiaV3CrashGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3GamudaCapPatternId =
  | 'baseline_v3'
  | 'exclude_gamuda'
  | 'cap_25'
  | 'cap_20'
  | 'cap_15'
  | 'cap_10';

export type ForwardMalaysiaV3GamudaCapGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV3GamudaCapBootstrap = {
  runs: number;
  bankruptcyRatePct: number;
  p5MinEquityMYR: number;
  worstMinEquityMYR: number;
};

export type ForwardMalaysiaV3GamudaCapDelistMetrics = {
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  minEquityMYR: number;
  finalEquityMYR: number;
  bootstrap: ForwardMalaysiaV3GamudaCapBootstrap;
};

export type ForwardMalaysiaV3GamudaCapPatternRow = {
  patternId: ForwardMalaysiaV3GamudaCapPatternId;
  labelJa: string;
  phase3Weights: Record<string, number>;
  phase4Weights: Record<string, number>;
  weightLabelJa: string;
  cumulativeReturnPct: number;
  profitFactor: number | null;
  sharpe: number | null;
  maxDrawdownPct: number;
  bootstrap: ForwardMalaysiaV3GamudaCapBootstrap;
  delist: ForwardMalaysiaV3GamudaCapDelistMetrics;
  gamudaDependencyPct: number;
  maxSingleDependencyPct: number;
  symbolDependencyPct: Record<string, number>;
  monthsToRm10000: number | null;
  monthsToRm100000: number | null;
};

export type ForwardMalaysiaV3GamudaCapCashCompareRow = {
  cashReservePct: number;
  labelJa: string;
  adoptedPatternId: ForwardMalaysiaV3GamudaCapPatternId;
  delistMinEquityMYR: number;
  delistMaxDrawdownPct: number;
  delistBankruptcyRatePct: number;
  monthsToRm100000: number | null;
};

export type ForwardMalaysiaV3GamudaCapAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  monthlyContributionMYR: number;
  baselineDelistBankruptcyPct: number;
  patterns: ForwardMalaysiaV3GamudaCapPatternRow[];
  cashCompare: ForwardMalaysiaV3GamudaCapCashCompareRow[];
  adoptedPatternId: ForwardMalaysiaV3GamudaCapPatternId;
  delistMcUnder5Pct: boolean;
  gamudaDependencyUnder50Pct: boolean;
  adoptionGrade: ForwardMalaysiaV3GamudaCapGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3Cap15TradeRow = {
  id: string;
  symbol: string;
  symbolNameJa: string;
  phase: 'phase3' | 'phase4';
  signalDate: string;
  entryDate: string;
  exitDate: string;
  notionalMYR: number;
  weightPct: number;
  returnPct: number;
  pnlMYR: number;
  equityAfterMYR: number;
};

export type ForwardMalaysiaV3Cap15SymbolStatRow = {
  symbol: string;
  symbolNameJa: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  profitFactor: number | null;
  totalPnlMYR: number;
  profitContributionPct: number;
  avgNotionalMYR: number;
  avgReturnPct: number;
  compensationVsBaselineMYR: number;
};

export type ForwardMalaysiaV3Cap15CompensationRow = {
  symbol: string;
  symbolNameJa: string;
  baselinePnlMYR: number;
  cap15PnlMYR: number;
  deltaPnlMYR: number;
  roleJa: string;
};

export type ForwardMalaysiaV3Cap15Grade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV3Cap15AuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  phaseWeightsLabelJa: string;
  tradeHistory: ForwardMalaysiaV3Cap15TradeRow[];
  symbolStats: ForwardMalaysiaV3Cap15SymbolStatRow[];
  compensation: ForwardMalaysiaV3Cap15CompensationRow[];
  cumulativeReturnPct: number;
  totalPnlMYR: number;
  totalContributedMYR: number;
  finalEquityMYR: number;
  tradeCount: number;
  gamudaDependencyPct: number;
  baselineCumulativeReturnPct: number;
  baselineGamudaDependencyPct: number;
  maintenanceReasonJa: string;
  wfOos: {
    trainTradeCount: number;
    testTradeCount: number;
    trainWinRatePct: number;
    testWinRatePct: number;
    trainAvgPnlMYR: number;
    testAvgPnlMYR: number;
    overfitVerdictJa: string;
  };
  ledgerReconciled: boolean;
  adoptionGrade: ForwardMalaysiaV3Cap15Grade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3YtlStressScenarioId =
  | 'baseline'
  | 'ytl_delist'
  | 'ytl_minus70'
  | 'ytl_minus50'
  | 'ytl_trade_ban'
  | 'ytl_profit_zero';

export type ForwardMalaysiaV3YtlReplacementId =
  | 'r_misc'
  | 'r_celcomdigi'
  | 'r_maybank'
  | 'r_public';

export type ForwardMalaysiaV3YtlDependencyGrade = 'A' | 'B' | 'C' | 'D';

export type ForwardMalaysiaV3YtlStressBootstrap = {
  runs: number;
  bankruptcyRatePct: number;
  p5MinEquityMYR: number;
  worstMinEquityMYR: number;
};

export type ForwardMalaysiaV3YtlStressScenarioRow = {
  scenarioId: ForwardMalaysiaV3YtlStressScenarioId;
  labelJa: string;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  minEquityMYR: number;
  finalEquityMYR: number;
  profitContributionPct: Record<string, number>;
  ytlNetContributionPct: number;
  ytlPositiveDependencyPct: number;
  bootstrap: ForwardMalaysiaV3YtlStressBootstrap;
  survived: boolean;
};

export type ForwardMalaysiaV3YtlReplacementRow = {
  replacementId: ForwardMalaysiaV3YtlReplacementId;
  labelJa: string;
  symbol: string;
  cumulativeReturnPct: number;
  maxDrawdownPct: number;
  sharpe: number | null;
  replacementNetContributionPct: number;
  ytlNetContributionPct: number;
  fetchOk: boolean;
};

export type ForwardMalaysiaV3YtlDependencyAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  phaseWeightsLabelJa: string;
  baselineCumulativeReturnPct: number;
  profitContributionPct: Record<string, number>;
  ytlNetContributionPct: number;
  ytlPositiveDependencyPct: number;
  scenarios: ForwardMalaysiaV3YtlStressScenarioRow[];
  replacements: ForwardMalaysiaV3YtlReplacementRow[];
  worstScenarioId: ForwardMalaysiaV3YtlStressScenarioId;
  adoptedReplacementId: ForwardMalaysiaV3YtlReplacementId | null;
  adoptionGrade: ForwardMalaysiaV3YtlDependencyGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV3YtlVerifyScenarioId =
  | 'baseline_cap15'
  | 'ytl_trade_ban'
  | 'ytl_profit_zero'
  | 'ytl_price_fixed'
  | 'ytl_trades_removed'
  | 'ytl_delist'
  | 'ytl_minus70';

export type ForwardMalaysiaV3YtlVerifyGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV3YtlVerifyTradeRow = {
  id: string;
  symbol: string;
  symbolNameJa: string;
  entryDate: string;
  exitDate: string;
  notionalMYR: number;
  returnPct: number;
  pnlMYR: number;
  rank?: number;
};

export type ForwardMalaysiaV3YtlVerifyScenarioRow = {
  scenarioId: ForwardMalaysiaV3YtlVerifyScenarioId;
  labelJa: string;
  tradeCount: number;
  ytlTradeCount: number;
  disappearedTradeCount: number;
  disappearedYtlTradeCount: number;
  disappearedTradeIds: string[];
  cumulativeReturnPct: number;
  cumulativeDeltaVsBaselinePct: number;
  maxDrawdownPct: number;
  maxDrawdownDeltaVsBaselinePct: number;
  minEquityMYR: number;
  bankruptcyRatePct: number;
  bankruptcyDeltaVsBaselinePct: number;
  ledgerTrades: ForwardMalaysiaV3YtlVerifyTradeRow[];
};

export type ForwardMalaysiaV3YtlVerifyAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselineTradeCount: number;
  baselineYtlTradeCount: number;
  scenarios: ForwardMalaysiaV3YtlVerifyScenarioRow[];
  top10YtlTrades: ForwardMalaysiaV3YtlVerifyTradeRow[];
  top5YtlPnlSumMYR: number;
  delistYtlTradeCount: number;
  delistDisappearedYtlCount: number;
  implementationBugDetected: boolean;
  trueYtlDependencyPct: number;
  verifyGrade: ForwardMalaysiaV3YtlVerifyGrade;
  verifyVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV4YtlPolicyId =
  | 'ytl_exclude'
  | 'ytl_cap_20'
  | 'ytl_cap_15'
  | 'ytl_cap_10';

export type ForwardMalaysiaV4CandidateId =
  | 'v4_misc'
  | 'v4_maybank'
  | 'v4_celcomdigi'
  | 'v4_pbbank'
  | 'v4_sunway'
  | 'v4_genting'
  | 'v4_ijm'
  | 'v4_inari'
  | 'v4_axiata'
  | 'v4_tm';

export type ForwardMalaysiaV4AdoptionGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV4CandidateRow = {
  rowId: string;
  candidateId: ForwardMalaysiaV4CandidateId;
  candidateLabelJa: string;
  candidateSymbol: string;
  ytlPolicyId: ForwardMalaysiaV4YtlPolicyId;
  ytlPolicyLabelJa: string;
  ytlCapPct: number;
  cumulativeReturnPct: number;
  sharpe: number | null;
  maxDrawdownPct: number;
  minEquityMYR: number;
  delistBankruptcyRatePct: number;
  delistP5MinEquityMYR: number;
  candidateNetContributionPct: number;
  ytlNetContributionPct: number;
  fetchOk: boolean;
  meetsCumulativeTarget: boolean;
};

export type ForwardMalaysiaV4RankedEntry = {
  rank: number;
  rowId: string;
  candidateLabelJa: string;
  ytlPolicyLabelJa: string;
  value: number;
  valueLabelJa: string;
};

export type ForwardMalaysiaV4CandidateAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  baselineCumulativePct: number;
  cumulativeTargetPct: number;
  rows: ForwardMalaysiaV4CandidateRow[];
  top10Cumulative: ForwardMalaysiaV4RankedEntry[];
  top10Sharpe: ForwardMalaysiaV4RankedEntry[];
  top10MaxDd: ForwardMalaysiaV4RankedEntry[];
  top10DelistMc: ForwardMalaysiaV4RankedEntry[];
  compositeRanking: ForwardMalaysiaV4RankedEntry[];
  v4CandidateId: ForwardMalaysiaV4CandidateId | null;
  v4CandidateLabelJa: string | null;
  v4YtlPolicyId: ForwardMalaysiaV4YtlPolicyId | null;
  adoptionGrade: ForwardMalaysiaV4AdoptionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV4AttributionBasisId = 'actual' | 'oos' | 'bootstrap';

export type ForwardMalaysiaV4AttributionGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV4SymbolAttributionRow = {
  symbol: string;
  symbolNameJa: string;
  tradeCount: number;
  totalPnlMYR: number;
  profitContributionPct: number;
  avgNotionalMYR: number;
};

export type ForwardMalaysiaV4BasisAttribution = {
  basisId: ForwardMalaysiaV4AttributionBasisId;
  labelJa: string;
  portfolioLabelJa: string;
  cumulativeReturnPct: number;
  totalNetPnlMYR: number;
  symbols: ForwardMalaysiaV4SymbolAttributionRow[];
};

export type ForwardMalaysiaV4AttributionAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  audit73YtlDependencyPct: number;
  audit76YtlDependencyPct: number;
  v3CumulativePct: number;
  v4CumulativePct: number;
  v3Attributions: ForwardMalaysiaV4BasisAttribution[];
  v4Attributions: ForwardMalaysiaV4BasisAttribution[];
  ijmAddedProfitMYR: number;
  ytlProfitDeltaMYR: number;
  ytlToIjmShiftMYR: number;
  weightAttributionJa: string;
  v4ProfitBreakdownJa: string;
  adoptionGrade: ForwardMalaysiaV4AttributionGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV4IjmOosGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV4IjmTradeRow = {
  id: string;
  entryDate: string;
  exitDate: string;
  phase: 'phase3' | 'phase4';
  phaseLabelJa: string;
  isOos: boolean;
  notionalMYR: number;
  returnPct: number;
  pnlMYR: number;
  year: string;
};

export type ForwardMalaysiaV4IjmYearRow = {
  year: string;
  tradeCount: number;
  winCount: number;
  winRatePct: number;
  totalPnlMYR: number;
  profitFactor: number | null;
};

export type ForwardMalaysiaV4IjmPhaseEvalRow = {
  phaseId: 'phase1' | 'phase2';
  labelJa: string;
  tradeCount: number;
  winRatePct: number;
  profitFactor: number | null;
  totalPnlMYR: number;
  maxDrawdownPct: number;
  expectancyMYR: number;
};

export type ForwardMalaysiaV4IjmOosAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  oosFromDate: string;
  fixedConditionsJa: string;
  allIjmTrades: ForwardMalaysiaV4IjmTradeRow[];
  oosTradeCount: number;
  inSampleTradeCount: number;
  oosWinRatePct: number;
  oosProfitFactor: number | null;
  oosExpectancyMYR: number;
  oosMaxLossMYR: number;
  oosMaxDrawdownPct: number;
  oosTotalPnlMYR: number;
  oosCollapsed: boolean;
  fullWinRatePct: number;
  fullProfitFactor: number | null;
  fullExpectancyMYR: number;
  fullMaxDrawdownPct: number;
  fullTotalPnlMYR: number;
  yearlyRows: ForwardMalaysiaV4IjmYearRow[];
  top10Profit: ForwardMalaysiaV4IjmTradeRow[];
  bottom10Loss: ForwardMalaysiaV4IjmTradeRow[];
  phaseEvals: ForwardMalaysiaV4IjmPhaseEvalRow[];
  bootstrap1000: {
    runs: number;
    meanIjmPnlMYR: number;
    meanOosIjmPnlMYR: number;
    oosNegativeRatePct: number;
    p5IjmPnlMYR: number;
  };
  monteCarlo10000: {
    runs: number;
    bankruptcyRatePct: number;
    meanCumulativePct: number;
    p5CumulativePct: number;
  };
  adoptionGrade: ForwardMalaysiaV4IjmOosGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV4FinalCompareGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV4FinalCompareRow = {
  candidateId: ForwardMalaysiaV4CandidateId;
  candidateLabelJa: string;
  candidateSymbol: string;
  cumulativeReturnPct: number;
  sharpe: number | null;
  profitFactor: number | null;
  maxDrawdownPct: number;
  minEquityMYR: number;
  delistBankruptcyRatePct: number;
  delistP5MinEquityMYR: number;
  oosCumulativeReturnPct: number;
  oosCandidatePnlMYR: number;
  oosTradeCount: number;
  oosWinRatePct: number;
  oosProfitFactor: number | null;
  bootstrap1000: {
    runs: number;
    meanCumulativePct: number;
    p5CumulativePct: number;
    meanCandidatePnlMYR: number;
    oosNegativeRatePct: number;
  };
  monteCarlo10000: {
    runs: number;
    bankruptcyRatePct: number;
    meanCumulativePct: number;
    p5CumulativePct: number;
  };
  compositeScore: number;
  compositeRank: number;
  fetchOk: boolean;
};

export type ForwardMalaysiaV4FinalCompareRankedEntry = {
  rank: number;
  candidateId: ForwardMalaysiaV4CandidateId;
  candidateLabelJa: string;
  value: number;
  valueLabelJa: string;
};

export type ForwardMalaysiaV4FinalCompareAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  oosFromDate: string;
  fixedConditionsJa: string;
  compositeWeightsJa: string;
  rows: ForwardMalaysiaV4FinalCompareRow[];
  compositeRanking: ForwardMalaysiaV4FinalCompareRankedEntry[];
  oosRanking: ForwardMalaysiaV4FinalCompareRankedEntry[];
  mcRanking: ForwardMalaysiaV4FinalCompareRankedEntry[];
  ijmRow: ForwardMalaysiaV4FinalCompareRow | null;
  bestCompositeRow: ForwardMalaysiaV4FinalCompareRow | null;
  adoptionGrade: ForwardMalaysiaV4FinalCompareGrade;
  adoptionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardMalaysiaV4OpsRiskLevel = 'green' | 'yellow' | 'orange' | 'red';

export type ForwardMalaysiaV4YtlWarningLevel =
  | 'none'
  | 'warn35'
  | 'warn40'
  | 'warn45'
  | 'warn50';

export type ForwardMalaysiaV4OpsSymbolMonthlyRow = {
  yearMonth: string;
  symbol: string;
  symbolNameJa: string;
  tradeCount: number;
  profitContributionPct: number;
  winRatePct: number;
  profitFactor: number | null;
  maxDrawdownPct: number;
  cumulativePnlMYR: number;
};

export type ForwardMalaysiaV4OpsSymbolSnapshot = {
  symbol: string;
  symbolNameJa: string;
  profitContributionPct: number;
  winRatePct: number;
  profitFactor: number | null;
  maxDrawdownPct: number;
  cumulativePnlMYR: number;
  tradeCount: number;
};

export type ForwardMalaysiaV4OpsConcentration = {
  hhi: number;
  top1ProfitContributionPct: number;
  top2ProfitContributionPct: number;
  effectiveN: number;
};

export type ForwardMalaysiaV4OpsAllocationRow = {
  symbol: string;
  symbolNameJa: string;
  recommendedWeightPct: number;
  currentWeightPct: number;
  deltaWeightPct: number;
  action: 'hold' | 'buy' | 'sell';
};

export type ForwardMalaysiaV4OpsMonitorAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  targetWeightsJa: string;
  ytlDependencyPct: number;
  ytlWarningLevel: ForwardMalaysiaV4YtlWarningLevel;
  ytlWarningLabelJa: string;
  concentration: ForwardMalaysiaV4OpsConcentration;
  symbolSnapshots: ForwardMalaysiaV4OpsSymbolSnapshot[];
  monthlyRows: ForwardMalaysiaV4OpsSymbolMonthlyRow[];
  riskLevel: ForwardMalaysiaV4OpsRiskLevel;
  riskLabelJa: string;
  allocationRows: ForwardMalaysiaV4OpsAllocationRow[];
  sellCandidates: string[];
  buyCandidates: string[];
  rebalanceProposalJa: string;
  portfolioCumulativeReturnPct: number;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
  jsonPayload: string;
};

export type ForwardMalaysiaV4YahooQualitySymbolRow = {
  symbol: string;
  yahooSymbol: string;
  yahooOk: boolean;
  twelveOk: boolean;
  yahooBarCount: number;
  twelveBarCount: number;
  missingRatePct: number;
  anomalyRatePct: number;
  updateDelayDays: number;
  latestDate: string | null;
  twelveLatestDate: string | null;
  priceCorrelation: number | null;
  avgAbsReturnDiffPct: number | null;
};

export type ForwardMalaysiaV4YahooProductionGrade = 'A' | 'B' | 'C';

export type ForwardMalaysiaV4YahooQualityAuditReport = {
  auditedAt: string;
  fromDate: string;
  toDate: string;
  fixedConditionsJa: string;
  symbolRows: ForwardMalaysiaV4YahooQualitySymbolRow[];
  aggregateMissingRatePct: number;
  aggregateAnomalyRatePct: number;
  aggregateUpdateDelayDays: number;
  yahooSuccessRatePct: number;
  twelveSuccessRatePct: number;
  twelveDataAvailable: boolean;
  productionGrade: ForwardMalaysiaV4YahooProductionGrade;
  productionVerdictJa: string;
  answerAJa: string;
  answerBJa: string;
  answerCJa: string;
  answerDJa: string;
  answerEJa: string;
  answerFJa: string;
  consistencyNoteJa: string;
  humanSummaryJa: string;
};

export type ForwardValidationPersisted = {
  version: 1;
  startedAt: string;
  lastRunDate: string | null;
  lastRunAt: string | null;
  lastFetchAt: string | null;
  yahooLatestDate: string | null;
  yahooFetchLog: ForwardYahooFetchLog | null;
  initialCapitalUsd: number;
  signals: ForwardSignalRecord[];
  openPositions: ForwardOpenPosition[];
  closedTrades: ForwardClosedTrade[];
  dailyReturns: ForwardDailyReturn[];
  equityUsd: number;
  peakEquityUsd: number;
  report: ForwardValidationReport | null;
  reports: ForwardValidationReport[];
  reportGeneratedAt: string | null;
};
