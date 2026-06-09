/** Bursa Malaysia 開示データ（KLSE Screener 経由・Phase 1） */

export type BursaDisclosureSource = 'klse_screener' | 'none';

export type BursaFetchStatus = 'ok' | 'partial' | 'failed' | 'cached';

export type BursaCompanyProfile = {
  stockCode: string;
  companyName: string | null;
  companyOverview: string | null;
  sector: string | null;
  subSector: string | null;
  marketCap: number | null;
  marketCapCurrency: 'MYR';
  sharesOutstanding: number | null;
  pe: number | null;
  eps: number | null;
  dividendYieldPct: number | null;
  fetchedFields: string[];
  missingFields: string[];
  status: BursaFetchStatus;
  source: BursaDisclosureSource;
  fetchedAt: string;
};

export type BursaQuarterlyRecord = {
  financialYear: string | null;
  quarter: string | null;
  quarterEndDate: string | null;
  announcedDate: string | null;
  revenue: number | null;
  operatingProfit: number | null;
  netProfit: number | null;
  eps: number | null;
  roePct: number | null;
  netMarginPct: number | null;
  dividendPayoutPct: number | null;
};

export type BursaQuarterlyBundle = {
  stockCode: string;
  latestQuarter: BursaQuarterlyRecord | null;
  quarterlyHistory: BursaQuarterlyRecord[];
  annualRecords: BursaQuarterlyRecord[];
  fetchedFields: string[];
  missingFields: string[];
  status: BursaFetchStatus;
  source: BursaDisclosureSource;
  fetchedAt: string;
};

export type BursaDividendRecord = {
  announcedDate: string | null;
  financialYear: string | null;
  dividendType: string | null;
  exDate: string | null;
  paymentDate: string | null;
  amountPerShare: number | null;
};

export type BursaDividendBundle = {
  stockCode: string;
  history: BursaDividendRecord[];
  fetchedFields: string[];
  missingFields: string[];
  status: BursaFetchStatus;
  source: BursaDisclosureSource;
  fetchedAt: string;
};

export type BursaDisclosureBundle = {
  stockCode: string;
  profile: BursaCompanyProfile;
  quarterly: BursaQuarterlyBundle;
  dividend: BursaDividendBundle;
  dataSource: BursaDisclosureSource;
  fetchedFields: string[];
  missingFields: string[];
  apiNotes: string[];
};

/** Phase 3 — 同業スナップショット（KLSE Screener 実データ） */
export type BursaPeerSnapshot = {
  stockCode: string;
  companyName: string | null;
  marketCap: number | null;
  pe: number | null;
  dividendYieldPct: number | null;
  roePct: number | null;
  revenue: number | null;
  netProfit: number | null;
  eps: number | null;
  status: 'ok' | 'partial' | 'failed';
  fromCache?: boolean;
};

export type BursaPeerMetricKey =
  | 'marketCap'
  | 'pe'
  | 'dividendYieldPct'
  | 'roePct'
  | 'netProfit'
  | 'eps';

export type BursaCompetitiveDimension = {
  score: number | null;
  reasonJa: string;
};

export type BursaBuffettComponent = {
  labelJa: string;
  score: number | null;
  maxScore: number;
  reasonJa: string;
};

export type BursaPhase3Analysis = {
  sectorKey: string | null;
  sectorLabelJa: string;
  peerSnapshots: BursaPeerSnapshot[];
  peerNames: string[];
  comparisonMetrics: Array<{
    metricKey: BursaPeerMetricKey;
    labelJa: string;
    targetValue: number | null;
    targetRank: number | null;
    peerCount: number;
    valuesByCode: Record<string, number | null>;
  }>;
  industryCompanyCount: number;
  industryRanks: {
    marketCap: number | null;
    netProfit: number | null;
    dividendYield: number | null;
    roe: number | null;
    overall: number | null;
  };
  competitiveAdvantage: {
    entryBarrier: BursaCompetitiveDimension;
    brandPower: BursaCompetitiveDimension;
    marketShare: BursaCompetitiveDimension;
    priceCompetitiveness: BursaCompetitiveDimension;
    overseasExpansion: BursaCompetitiveDimension;
  };
  buffettScore: {
    totalScore: number | null;
    maxScore: number;
    components: BursaBuffettComponent[];
  };
  enhancedInvestmentType: string | null;
  enhancedJudgmentReasons: string[];
  peerMedianPe: number | null;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 4 — 四季報形式 */
export type BursaMajorShareholder = {
  name: string;
  holdingPct: number | null;
  asOfDate: string | null;
  source: 'annual_report_pdf' | 'bursa_substantial_change' | 'none';
};

export type BursaSegmentRevenue = {
  segmentName: string;
  revenue: number | null;
  revenuePct: number | null;
};

export type BursaGeographicRevenue = {
  region: 'Malaysia' | 'Singapore' | 'Indonesia' | 'Thailand' | 'Others';
  revenue: number | null;
  revenuePct: number | null;
};

export type BursaShikihoComments = {
  performanceJa: string;
  strengthsJa: string;
  risksJa: string;
  dividendJa: string;
  summaryJa: string;
};

export type BursaForecastItem = {
  label: string;
  value: string | null;
  source: string | null;
};

export type BursaPhase4Analysis = {
  majorShareholders: BursaMajorShareholder[];
  shareholderSourceNote: string;
  segmentRevenue: BursaSegmentRevenue[];
  geographicRevenue: BursaGeographicRevenue[];
  comments: BursaShikihoComments;
  currentPeriodForecast: BursaForecastItem[];
  nextPeriodForecast: BursaForecastItem[];
  currentForecastStatus: 'available' | 'none' | 'missing';
  nextForecastStatus: 'available' | 'undisclosed' | 'missing';
  annualReportAnnouncementUrl: string | null;
  latestFinancialReportUrl: string | null;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 5 — アナリスト機能 */
export type BursaEnhancedPeerMetricKey =
  | 'revenue'
  | 'netProfit'
  | 'eps'
  | 'roePct'
  | 'dividendYieldPct';

export type BursaEnhancedPeerComparison = {
  metricKey: BursaEnhancedPeerMetricKey;
  labelJa: string;
  targetValue: number | null;
  industryAverage: number | null;
  diffPct: number | null;
};

export type BursaFairValueAnalysis = {
  method: 'PER';
  currentPrice: number | null;
  epsSen: number | null;
  industryMedianPe: number | null;
  fairPrice: number | null;
  discountPct: number | null;
};

export type BursaDividendRating = '優秀' | '普通' | '注意';

export type BursaDividendJudgment = {
  currentDividend: number | null;
  fiveYearAverage: number | null;
  growthRatePct: number | null;
  cutCount: number | null;
  cutYears: number[];
  rating: BursaDividendRating | null;
};

export type BursaTrendDirection = '上昇' | '横ばい' | '下降';

export type BursaTrendJudgment = {
  revenue: BursaTrendDirection | null;
  netProfit: BursaTrendDirection | null;
  eps: BursaTrendDirection | null;
};

export type BursaOverallInvestmentJudgment =
  | '強気買い'
  | '買い'
  | '保有'
  | '注意'
  | '見送り';

export type BursaPhase5Analysis = {
  enhancedPeerComparison: BursaEnhancedPeerComparison[];
  fairValue: BursaFairValueAnalysis;
  dividendJudgment: BursaDividendJudgment;
  trendJudgment: BursaTrendJudgment;
  overallJudgment: BursaOverallInvestmentJudgment | null;
  judgmentReasons: string[];
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 6 — Bursa 銘柄発掘 */
export type BursaPhase6RankedEntry = {
  stockCode: string;
  companyName: string | null;
  sector: string | null;
  rank: number;
  compositeScore: number | null;
  growth: number | null;
  profitability: number | null;
  stability: number | null;
  value: number | null;
  dividendAppeal: number | null;
  competitiveAdvantage: number | null;
  dividendYieldPct: number | null;
  marketCap: number | null;
  currentPrice: number | null;
  dataStatus: 'ok' | 'partial' | 'failed';
};

export type BursaPhase6PortfolioRow = {
  stockCode: string;
  companyName: string | null;
  allocationMYR: number;
  allocationPct: number;
  sharesApprox: number | null;
  currentPrice: number | null;
};

export type BursaPhase6PortfolioSuggestion = {
  budgetMYR: number;
  rows: BursaPhase6PortfolioRow[];
};

export type BursaPhase6HoldingComparison = {
  symbol: string;
  companyName: string | null;
  holdingScore: number | null;
  holdingRank: number | null;
  top100AvgScore: number | null;
  vsTopAvgPct: number | null;
};

export type BursaPhase6ReplacementCandidate = {
  stockCode: string;
  companyName: string | null;
  score: number;
  rank: number;
  scoreDiff: number;
};

export type BursaPhase6ReplacementSuggestion = {
  heldSymbol: string;
  heldCompanyName: string | null;
  heldScore: number | null;
  heldRank: number | null;
  candidates: BursaPhase6ReplacementCandidate[];
};

export type BursaPhase6StyleRankings = {
  composite: BursaPhase6RankedEntry[];
  dividend: BursaPhase6RankedEntry[];
  growth: BursaPhase6RankedEntry[];
  value: BursaPhase6RankedEntry[];
  stability: BursaPhase6RankedEntry[];
  beginner: BursaPhase6RankedEntry[];
};

export type BursaPhase6Analysis = {
  rankedTop100: BursaPhase6RankedEntry[];
  styleRankings: BursaPhase6StyleRankings;
  portfolioSuggestions: BursaPhase6PortfolioSuggestion[];
  holdingComparisons: BursaPhase6HoldingComparison[];
  replacementSuggestions: BursaPhase6ReplacementSuggestion[];
  universeSize: number;
  scoredCount: number;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 7 — AI資産運用（売買判断・ポートフォリオ診断） */
export type BursaHoldingActionJudgment =
  | '強気買い'
  | '買い'
  | '保有'
  | '注意'
  | '売却候補';

export type BursaAddPositionVerdict = '買い増し' | '様子見' | '買い増し不可';

export type BursaPhase7HoldingDiagnosis = {
  symbol: string;
  companyName: string | null;
  judgment: BursaHoldingActionJudgment | null;
  reasons: string[];
  compositeScore: number | null;
  rank: number | null;
};

export type BursaPhase7AddPosition = {
  symbol: string;
  companyName: string | null;
  currentPrice: number | null;
  fairPrice: number | null;
  industryMedianPe: number | null;
  verdict: BursaAddPositionVerdict | null;
  reasonJa: string;
};

export type BursaPhase7TakeProfit = {
  symbol: string;
  companyName: string | null;
  targetPrice: number | null;
  fairPrice: number | null;
  currentPrice: number | null;
  premiumPct: number | null;
  recommendTakeProfit: boolean | null;
  reasonJa: string;
};

export type BursaPhase7StopLoss = {
  symbol: string;
  companyName: string | null;
  warnings: string[];
  hasWarning: boolean;
};

export type BursaPhase7PortfolioHealth = {
  score: number | null;
  sectorBiasJa: string;
  dividendDependencyJa: string;
  largeCapDependencyJa: string;
  growthRatioJa: string;
};

export type BursaPhase7ReconstructionCandidate = {
  stockCode: string;
  companyName: string | null;
  score: number | null;
  rank: number | null;
  reasonJa: string;
};

export type BursaPhase7Reconstruction = {
  swapCandidates: Array<{
    removeSymbol: string;
    removeName: string | null;
    addSymbol: string;
    addName: string | null;
    scoreDiff: number;
    reasonJa: string;
  }>;
  addCandidates: BursaPhase7ReconstructionCandidate[];
  removeCandidates: BursaPhase7ReconstructionCandidate[];
};

export type BursaInvestorType = '高配当型' | '成長型' | '割安型' | 'バランス型';

export type BursaPhase7Analysis = {
  holdingsDiagnosis: BursaPhase7HoldingDiagnosis[];
  addPosition: BursaPhase7AddPosition[];
  takeProfit: BursaPhase7TakeProfit[];
  stopLoss: BursaPhase7StopLoss[];
  portfolioHealth: BursaPhase7PortfolioHealth;
  reconstruction: BursaPhase7Reconstruction;
  investorType: BursaInvestorType | null;
  investorTypeReasonJa: string;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 8 — 今日の売買（行動提案） */
export type BursaPhase8BuyCandidate = {
  stockCode: string;
  companyName: string | null;
  rank: number | null;
  compositeScore: number | null;
  currentPrice: number | null;
  fairPrice: number | null;
  discountPct: number | null;
  judgment: BursaOverallInvestmentJudgment | null;
  reasonJa: string;
};

export type BursaPhase8SellCandidate = {
  symbol: string;
  companyName: string | null;
  kind: '利益確定' | '損切り' | '売却';
  reasonJa: string;
  currentPrice: number | null;
  premiumPct: number | null;
};

export type BursaPhase8AllocationRow = {
  stockCode: string;
  companyName: string | null;
  allocationMYR: number;
  allocationPct: number;
  currentPrice: number | null;
  shares: number | null;
  requiredMYR: number | null;
  remainderMYR: number | null;
};

export type BursaPhase8BudgetPlan = {
  budgetMYR: number;
  rows: BursaPhase8AllocationRow[];
  totalRequiredMYR: number | null;
  totalRemainderMYR: number | null;
};

export type BursaPhase8PriorityItem = {
  symbol: string;
  companyName: string | null;
  priority: BursaHoldingActionJudgment | '売却';
  reasonJa: string;
  sortOrder: number;
};

export type BursaPhase8PrimaryAction = {
  actionJa: string;
  kind: 'buy' | 'sell' | 'wait';
  symbol: string | null;
  shares: number | null;
  reasonJa: string;
};

export type BursaPhase8Analysis = {
  buyTop10: BursaPhase8BuyCandidate[];
  sellCandidates: BursaPhase8SellCandidate[];
  budgetPlans: BursaPhase8BudgetPlan[];
  primaryAction: BursaPhase8PrimaryAction;
  priorityOrder: BursaPhase8PriorityItem[];
  notifications: string[];
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 9 — 市場監視（リアルタイム変化） */
export type BursaDividendChangeStatus = '増配' | '維持' | '減配' | '無配';

export type BursaMonitoringAlertKind =
  | '順位急上昇'
  | '順位急落'
  | '増配'
  | '減配'
  | '利益急増'
  | '利益急減';

export type BursaMonitoringRankChange = {
  stockCode: string;
  companyName: string | null;
  previousRank: number | null;
  currentRank: number | null;
  delta: number | null;
  changeLabelJa: string;
  isHolding: boolean;
  isWatchlist: boolean;
};

export type BursaMonitoringEarningsChange = {
  stockCode: string;
  companyName: string | null;
  latestPeriodJa: string;
  previousPeriodJa: string;
  revenueLatest: number | null;
  revenuePrevious: number | null;
  revenueChangePct: number | null;
  netProfitLatest: number | null;
  netProfitPrevious: number | null;
  netProfitChangePct: number | null;
  epsLatest: number | null;
  epsPrevious: number | null;
  epsChangePct: number | null;
  dividendLatest: number | null;
  dividendPrevious: number | null;
  dividendChangePct: number | null;
  isHolding: boolean;
  isWatchlist: boolean;
};

export type BursaMonitoringDividendChange = {
  stockCode: string;
  companyName: string | null;
  status: BursaDividendChangeStatus | null;
  latestYear: number | null;
  previousYear: number | null;
  latestAmount: number | null;
  previousAmount: number | null;
  reasonJa: string;
  isHolding: boolean;
  isWatchlist: boolean;
};

export type BursaMonitoringAlert = {
  id: string;
  at: string;
  stockCode: string;
  companyName: string | null;
  kind: BursaMonitoringAlertKind;
  messageJa: string;
  isHolding: boolean;
};

export type BursaWatchlistEntry = {
  stockCode: string;
  companyName: string | null;
  addedAt: string;
};

export type BursaAlertHistoryEntry = {
  id: string;
  at: string;
  stockCode: string;
  companyName: string | null;
  kind: BursaMonitoringAlertKind;
  messageJa: string;
};

export type BursaMonitoringSnapshot = {
  capturedAt: string;
  ranks: Array<{
    stockCode: string;
    companyName: string | null;
    rank: number;
    compositeScore: number | null;
  }>;
};

export type BursaPhase9Analysis = {
  rankChanges: BursaMonitoringRankChange[];
  earningsChanges: BursaMonitoringEarningsChange[];
  dividendChanges: BursaMonitoringDividendChange[];
  holdingsMonitor: {
    rankChanges: BursaMonitoringRankChange[];
    earningsChanges: BursaMonitoringEarningsChange[];
    dividendChanges: BursaMonitoringDividendChange[];
  };
  watchlist: BursaWatchlistEntry[];
  alerts: BursaMonitoringAlert[];
  alertHistory: BursaAlertHistoryEntry[];
  notifications: string[];
  snapshotCapturedAt: string | null;
  previousSnapshotAt: string | null;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 10 — AIコンシェルジュ自発通知 */
export type BursaNotificationCategory =
  | '買い'
  | '売り'
  | '配当'
  | '決算'
  | '監視'
  | '市場全体';

export type BursaNotificationTriggerKind =
  | '強気買い'
  | '買い'
  | '注意'
  | '売却候補'
  | '増配'
  | '減配'
  | '利益急増'
  | '利益急減'
  | '順位急上昇'
  | '順位急落';

export type BursaConciergeNotification = {
  id: string;
  createdAt: string;
  stockCode: string | null;
  companyName: string | null;
  category: BursaNotificationCategory;
  importance: 1 | 2 | 3 | 4 | 5;
  triggerKind: BursaNotificationTriggerKind;
  titleJa: string;
  messageJa: string;
  reasons: string[];
  isHolding: boolean;
  isRead: boolean;
};

export type BursaTodayAction = {
  actionJa: string;
  symbol: string | null;
  reasons: string[];
};

export type BursaPhase10Analysis = {
  notifications: BursaConciergeNotification[];
  todayAction: BursaTodayAction;
  topNotification: BursaConciergeNotification | null;
  soundEnabled: boolean;
  newCount: number;
  fetchedFields: string[];
  missingFields: string[];
};

/** Phase 11 — リアルタイム材料分析 */
export type BursaMaterialSource =
  | 'bursa_announcement'
  | 'news_api'
  | 'rss'
  | 'x'
  | 'reddit';

export type BursaMaterialSentiment = '好材料' | '悪材料' | '中立';

export type BursaMaterialSourceStatus = 'ok' | 'partial' | 'failed' | 'skipped' | 'unavailable';

export type BursaMaterialItem = {
  id: string;
  source: BursaMaterialSource;
  /** UI表示用（例: Reddit RSS） */
  sourceLabelJa?: string;
  sentiment: BursaMaterialSentiment;
  title: string;
  score: number;
  reasonJa: string;
  publishedAt: string | null;
  url: string | null;
};

export type BursaMaterialScoreBreakdown = {
  labelJa: string;
  score: number;
};

export type BursaNewsApiDiagnostics = {
  articleCount: number;
  fetchedAt: string;
  errorReason: string | null;
  httpStatus: number | null;
};

export type BursaRedditFetchMethod = 'rss' | 'oauth' | 'none';

export type RedditConfidenceJa = '高' | '中' | '低';

export type BursaRedditFetchDiagnostics = {
  fetchMethod: BursaRedditFetchMethod;
  fetchUrl: string | null;
  /** 有効件数（フィルタ・スコア後） */
  articleCount: number;
  /** RSS取得直後のユニーク件数 */
  fetchedCount: number;
  validCount: number;
  excludedCount: number;
  irrelevantRate: number;
  confidenceJa: RedditConfidenceJa;
  investmentConfidenceJa: RedditConfidenceJa;
  qualityWarningJa: string | null;
  titles: string[];
  searchQueries: string[];
  fetchedAt: string;
  errorReason: string | null;
  oauthConfigured: boolean;
};

export type BursaStockMaterialAnalysis = {
  stockCode: string;
  companyName: string | null;
  materialScore: number;
  scoreBreakdown: BursaMaterialScoreBreakdown[];
  positiveMaterials: BursaMaterialItem[];
  negativeMaterials: BursaMaterialItem[];
  neutralMaterials: BursaMaterialItem[];
  summaryLines: [string, string, string];
  buyReasonsToday: string[];
  sellReasonsToday: string[];
  sourceStatus: Record<BursaMaterialSource, BursaMaterialSourceStatus>;
  newsApiDiagnostics?: BursaNewsApiDiagnostics;
  redditFetchDiagnostics?: BursaRedditFetchDiagnostics;
  fetchedFields: string[];
  missingFields: string[];
};

export type BursaPhase11Analysis = {
  stocks: BursaStockMaterialAnalysis[];
  topMaterial: BursaStockMaterialAnalysis | null;
  monitoringNotifications: string[];
  fetchedFields: string[];
  missingFields: string[];
};
