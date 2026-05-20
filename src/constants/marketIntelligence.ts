import type { IntermarketRegimeId } from '../types/marketIntelligence';

/** 資産クラス相関ペア（サンプル銘柄代理） */
export const INTELLIGENCE_PROXY = {
  equity: 'SCHD',
  bond: 'KO',
  commodity: '5183',
  fxUs: 'SCHD',
  fxEm: '0820EA',
  volShort: 'INTC',
  volLong: 'KO',
  highYield: '1155',
  growth: 'INTC',
  defensive: 'KO',
} as const;

export const INTERMARKET_REGIME_LABEL: Record<IntermarketRegimeId, string> = {
  global_risk_on: 'グローバル・リスクオン',
  global_risk_off: 'グローバル・リスクオフ',
  inflation_stress: 'インフレ・ストレス',
  growth_slowdown: '成長鈍化',
  liquidity_crunch: '流動性クランチ',
  mixed_transition: '混合・遷移',
};

export const CORRELATION_BREAKDOWN_DELTA = 0.25;
export const PANIC_VIX_THRESHOLD = 28;
export const EUPHORIA_BREADTH_THRESHOLD = 72;
export const PANIC_BREADTH_THRESHOLD = 38;

export const MACRO_NEUTRAL = {
  dxyProxy: 10,
  us10yProxy: 50,
  vixProxy: 18,
  indexMomentumPct: 0,
  breadthPct: 55,
};
