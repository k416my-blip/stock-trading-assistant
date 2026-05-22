/** Core domain types — Rakuten Trade Malaysia (manual only) */

export type AppMode = 'manual' | 'practice';
export type Market = 'bursa' | 'us' | 'hk';
export type RiskLevel = 'low' | 'standard' | 'high';
export type InvestmentStyle = 'dividend' | 'growth' | 'balanced' | 'short_term';
export type Currency = 'MYR' | 'USD' | 'HKD';
export type AccountType = 'cash_upfront' | 'contra' | 'raku_margin';
export type StockSymbol = string;

/** おすすめ配分・スクリーナー用の銘柄タイプ */
export type StockCategory = 'etf' | 'stable' | 'dividend' | 'growth';

export interface StockFundamentals {
  symbol: StockSymbol;
  name: string;
  market: Market;
  currency: Currency;
  price: number;
  dividendYield: number;
  per: number;
  marketCap: number;
  volume: number;
  category: StockCategory;
  /** 株価が低め・1株から始めやすい */
  beginnerFriendly?: boolean;
}

export interface ScreenerFilters {
  minDividendYield?: number;
  maxPer?: number;
  minMarketCap?: number;
  minVolume?: number;
}

export interface RankedStock extends StockFundamentals {
  /** 総合おすすめ度 /100 */
  score: number;
  rank: number;
  recommendation: import('./recommendation').StockRecommendation;
}

export interface PriceBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalSnapshot {
  ma20: number;
  ma50: number;
  rsi14: number;
  volumeTrend: 'rising' | 'falling' | 'flat';
  buySignal: 'buy' | 'hold' | 'wait';
  sellSignal: 'sell' | 'hold' | 'wait';
}

export interface TradeSuggestion {
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  rationale: string;
}

export interface SellSuggestion {
  targetPrice: number;
  stopLoss: number;
  rationale: string;
}

export type PositionSizingRiskCategory = 'low' | 'medium' | 'high' | 'elevated';

export type ConvictionTier = 'low' | 'medium' | 'high' | 'extreme';

export interface PositionSizingResult {
  maxPositionValue: number;
  suggestedShares: number;
  riskPerTradePct: number;
  notes: string;
  /** 推奨ポートフォリオ配分 % */
  suggestedAllocationPct?: number;
  maxPositionSizeMYR?: number;
  riskCategory?: PositionSizingRiskCategory;
  convictionTier?: ConvictionTier;
  warnings?: string[];
}

export interface BrokerageEstimate {
  market: Market;
  tradeValue: number;
  currency: Currency;
  estimatedFee: number;
  note: string;
}

export interface PortfolioPosition {
  id: string;
  symbol: StockSymbol;
  market: Market;
  currency: Currency;
  shares: number;
  /** 平均購入単価（1株あたり） */
  averageBuyPrice: number;
  /** ユーザーが更新する現在株価（1株あたり） */
  currentPrice: number;
  currentPriceUpdatedAt?: string;
  priceSource?: 'manual' | 'api';
  priceFetchStatus?: 'ok' | 'failed' | 'pending';
  lastApiPriceAt?: string;
  /** 最後に成功した API 取得時刻 */
  lastSuccessfulFetchAt?: string;
  /** 現在価格の経過ミリ秒 */
  quoteAgeMs?: number;
  /** 最終成功取得からの経過秒 */
  quoteAgeSeconds?: number;
  /** ステール（古い）価格 */
  isStale?: boolean;
  /** 緊急キャッシュから復元した価格 */
  priceFromCache?: boolean;
  /** 最後に API 取得成功した価格（手動・失敗では上書きしない） */
  lastValidPrice?: number;
  /** 最後に成功した価格取得元 */
  lastQuoteProvider?: import('./quoteProvider').QuoteProviderId;
  /** 表示用会社名（quote / サンプルデータから取得） */
  companyName?: string;
  openedAt: string;
}

export interface TradeRecord {
  id: string;
  symbol: StockSymbol;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  shares: number;
  price: number;
  brokerageFee: number;
  executedAt: string;
  notes?: string;
  /** Practice mode: realized P&L on sell (MYR) */
  realizedPnLMYR?: number;
}

export interface DepositPlan {
  id: string;
  amountMYR: number;
  plannedDate: string;
  completed: boolean;
  note?: string;
}

export interface DividendRecord {
  id: string;
  symbol: StockSymbol;
  market: Market;
  currency: Currency;
  amount: number;
  receivedAt: string;
}

export interface PerformancePoint {
  date: string;
  portfolioValueMYR: number;
}

/** 保有銘柄の株価自動更新間隔（分） */
export type PriceRefreshMinutes = 1 | 5 | 10 | 15 | 30 | 60;

export interface UserSettings {
  totalCapitalMYR: number;
  riskPerTradePct: number;
  selectedMarket: Market;
  accountType: AccountType;
  priceRefreshMinutes: PriceRefreshMinutes;
}

export interface PracticeState {
  virtualCapitalMYR: number;
  cashBalanceMYR: number;
  portfolio: PortfolioPosition[];
  trades: TradeRecord[];
  performanceHistory: PerformancePoint[];
}

export interface PracticeStats {
  virtualCapitalMYR: number;
  cashBalanceMYR: number;
  holdingsValueMYR: number;
  portfolioValueMYR: number;
  unrealizedPnLMYR: number;
  realizedPnLMYR: number;
  winRatePct: number;
  winCount: number;
  lossCount: number;
  totalReturnPct: number;
}

export interface AllocationCandidate {
  symbol: StockSymbol;
  name: string;
  market: Market;
  currency: Currency;
  category: StockCategory;
  categoryLabel: string;
  allocationMYR: number;
  allocationPct: number;
  estimatedShares: number;
  /** 端株（小数株）で表示しているか */
  isFractionalShares: boolean;
  /** 1株買えるよう配分額を引き上げた */
  allocationAdjusted?: boolean;
  /** 1株未満で購入不可のとき */
  unpurchasableWarning?: string;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  selectionReason: string;
  beginnerNote: string;
  recommendation?: import('./recommendation').StockRecommendation;
}

export interface AllocationPlanInput {
  depositMYR: number;
  market: Market;
  riskLevel: RiskLevel;
  investmentStyle: InvestmentStyle;
  fractionalSharesEnabled: boolean;
}

export interface AllocationPlan {
  depositMYR: number;
  market: Market;
  riskLevel: RiskLevel;
  investmentStyle: InvestmentStyle;
  fractionalSharesEnabled: boolean;
  cashReserveMYR: number;
  cashReservePct: number;
  investableMYR: number;
  candidates: AllocationCandidate[];
  highRiskWarning?: string;
  affordabilityWarning?: string;
}

/** 手動注文チェックリスト（Rakuten Tradeでユーザーが入力） */
export interface ManualOrderItem {
  id: string;
  symbol: StockSymbol;
  name: string;
  market: Market;
  currency: Currency;
  side: 'buy' | 'sell';
  entryPrice: number;
  estimatedShares: number;
  allocationMYR: number;
  orderMethod: string;
  completed: boolean;
  createdAt: string;
  source: 'allocation' | 'holding' | 'sell_all' | 'screener';
}

/** すべて売却の1銘柄分 */
export interface SellAllLineItem {
  positionId: string;
  symbol: StockSymbol;
  name: string;
  market: Market;
  currency: Currency;
  shares: number;
  currentPrice: number;
  estimatedProceedsMYR: number;
  realizedPnLMYR?: number;
  skipped?: boolean;
  skipReason?: string;
}

/** すべて売却の結果（結果画面用） */
export interface SellAllResult {
  mode: 'practice' | 'manual';
  items: SellAllLineItem[];
  totalProceedsMYR: number;
  totalRealizedPnLMYR: number;
  soldCount: number;
  skippedCount: number;
  manualListCreated?: boolean;
  completedAt: string;
}

/** 通知音（カスタム音は開発ビルド／APK化後に有効） */
export type NotificationSound = 'default' | 'bell' | 'chime' | 'warning' | 'silent';

export type AlertType =
  | 'allocation_plan'
  | 'buy_candidate'
  | 'sell_candidate'
  | 'stop_loss_near'
  | 'take_profit_near'
  | 'market_open_bursa'
  | 'market_open_us'
  | 'market_open_hk'
  | 'market_close_bursa'
  | 'market_close_us'
  | 'market_close_hk';

export interface NotificationSettings {
  notifyBuyCandidate: boolean;
  notifySellCandidate: boolean;
  notifyStopLoss: boolean;
  notifyTakeProfit: boolean;
  notifyMarketOpenBefore: boolean;
  notifyMarketCloseBefore: boolean;
  sound: NotificationSound;
  vibrationEnabled: boolean;
}

export interface NotificationHistoryItem {
  id: string;
  alertType: AlertType;
  title: string;
  body: string;
  symbol?: string;
  market?: Market;
  sentAt: string;
}

/** cooldownKey → 最終送信時刻（Unix ms） */
export type NotificationCooldownMap = Record<string, number>;

export interface AppState {
  appMode: AppMode;
  settings: UserSettings;
  practice: PracticeState;
  deposits: DepositPlan[];
  portfolio: PortfolioPosition[];
  trades: TradeRecord[];
  dividends: DividendRecord[];
  performanceHistory: PerformancePoint[];
  manualOrderList: ManualOrderItem[];
  notificationSettings: NotificationSettings;
  notificationHistory: NotificationHistoryItem[];
  notificationCooldowns: NotificationCooldownMap;
}

export interface PositionPnL {
  symbol: string;
  market: Market;
  shares: number;
  averageBuyPrice: number;
  currentPrice: number;
  purchaseAmount: number;
  currentValue: number;
  unrealizedProfitLoss: number;
  unrealizedProfitLossPercent: number;
}

/** 保有銘柄カード表示用（損益＋配分・推奨損切／利確） */
export interface HoldingDetail extends PositionPnL {
  positionId: string;
  name: string;
  currency: Currency;
  purchaseAmount: number;
  purchaseAmountMYR: number;
  currentValueMYR: number;
  allocationPct: number;
  stopLossUnitPrice: number;
  takeProfitUnitPrice: number;
  suggestedStopLossTotal: number;
  suggestedTakeProfitTotal: number;
  suggestedStopLossTotalMYR: number;
  suggestedTakeProfitTotalMYR: number;
  isNearStopLoss: boolean;
  isNearTakeProfit: boolean;
  priceAvailable: boolean;
  /** カード表示用（評価額と同一ソース） */
  displayPrice: number;
  displayPriceSource?: 'api_live' | 'saved' | 'manual' | 'average_buy';
  lastSavedPrice?: number;
  priceSource?: 'manual' | 'api';
  /** 現在株価の表示補足（手動価格 / 前回取得価格 など） */
  priceStatusLabel?: string;
  /** API取得失敗だが価格表示はある場合の注意 */
  priceStaleWarning?: boolean;
  /** 取得から時間経過（ステール） */
  priceStaleByAge?: boolean;
  /** キャッシュ価格を使用中 */
  priceFromCache?: boolean;
  /** ステール価格バッジ表示 */
  isStale?: boolean;
  quoteAgeMs?: number;
  quoteAgeSeconds?: number;
  lastSuccessfulFetchAt?: string;
  /** API 成功時に確定した価格（評価額と一致） */
  lastValidPrice?: number;
  /** 表示用 Yahoo symbol（例: 4707.KL） */
  normalizedYahooSymbol?: string;
  /** 最後に成功した価格取得元の表示ラベル */
  lastQuoteProviderLabel?: string;
  /** 最終更新（表示用・ローカル時刻） */
  lastUpdatedDisplay?: string;
}

export interface BuyingPowerResult {
  totalCapitalMYR: number;
  investedMYR: number;
  buyingPowerMYR: number;
  accountType: AccountType;
  note: string;
}
