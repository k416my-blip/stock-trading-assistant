import type { FactorId, HiddenExposureThemeId } from '../types/portfolioRiskExposure';

/** Portfolio Quality Score — 100起点、減点式（高いほど健全） */
export const PQE_BASE = 100;
export const PQE_DEDUCT_CRITICAL_WARNING = 18;
export const PQE_DEDUCT_HIGH_WARNING = 10;
export const PQE_DEDUCT_WATCH = 4;
export const PQE_DEDUCT_BETA_OVER = 12;
export const PQE_DEDUCT_HIDDEN_THEME = 8;
export const PQE_DEDUCT_LOW_DATA_RELIABILITY = 15;
export const PQE_DEDUCT_MACRO_STRESS = 10;
export const PQE_DEDUCT_LIQUIDITY_CLUSTER = 8;

export const PQE_ESCALATION_THRESHOLD = 42;
export const PQE_DEFENSIVE_THRESHOLD = 55;

export const HIDDEN_THEME_LABELS_JA: Record<HiddenExposureThemeId, string> = {
  ai: 'AI / テック連動',
  semiconductor: '半導体クラスター',
  nasdaq: 'NASDAQ / 米グロース',
  rates: '金利感応',
  china: '中国関連',
  usd: 'USD建て集中',
  energy: 'エネルギー',
  financials: '金融',
};

export const FACTOR_LABELS_JA: Record<FactorId, string> = {
  growth: 'Growth',
  value: 'Value',
  momentum: 'Momentum',
  quality: 'Quality',
  dividend: 'Dividend',
  volatility: 'Volatility',
  liquidity: 'Liquidity',
};

export const STRESS_SCENARIO_LABELS_JA: Record<string, string> = {
  vix_spike: 'VIX急騰',
  rate_shock: '金利ショック',
  oil_shock: '原油ショック',
  ai_bubble_collapse: 'AIバブル崩壊',
  china_slowdown: '中国減速',
  usd_spike: 'ドル急騰',
  panic: 'パニック',
  liquidity_crisis: '流動性危機',
  recession: '景気後退',
};

export const PORTFOLIO_RISK_REGULATORY_JA =
  'ルールベースのポートフォリオリスク分析（参考）。学習・自動売買なし。';

export const PORTFOLIO_RISK_AI_PROMPT_JA = `
【Portfolio Risk & Exposure Intelligence】
- 個別銘柄ではなくポートフォリオ全体のリスク・偏り・ストレステストのみ引用。
- portfolioRiskExposure.portfolioQualityScore と riskEscalationBannerJa を優先。
- 危険時は守備・現金比率・ポジション上限を提案（執行は人間）。
`.trim();

export const PORTFOLIO_RISK_UI_LABELS_JA = {
  panelTitle: 'Portfolio Risk & Exposure',
  quality: 'Portfolio Quality',
  escalation: 'リスクエスカレーション',
  summary: 'AIポートフォリオ要約',
  heatmap: 'リスクヒートマップ',
  hidden: '隠れエクスポーザー',
  stress: 'ストレステスト',
  tail: 'テールリスク',
  beta: 'Beta',
  cash: '推奨現金比率',
  override: '人間リスク上書き',
} as const;

export const DEFAULT_MAX_POSITION_CAP_PCT = 18;
export const PANIC_MAX_POSITION_CAP_PCT = 10;
export const PANIC_CASH_RATIO_PCT = 35;
