import type { MarketRegimeId, SectorTheme } from '../types/marketRegime';

export const MARKET_REGIME_LABEL: Record<MarketRegimeId, string> = {
  risk_on: 'リスクオン',
  risk_off: 'リスクオフ',
  inflation_fear: 'インフレ懸念',
  recession_fear: '景気後退懸念',
  liquidity_bull: '流動性ブル',
  tightening_bear: '引き締めベア',
  recovery_phase: '回復局面',
  high_volatility: '高ボラティリティ',
};

export const SECTOR_THEME_LABEL: Record<SectorTheme, string> = {
  etf: 'ETF',
  dividend: '高配当',
  financial: '金融',
  technology: 'テック',
  energy: 'エネルギー',
  consumer: '消費財',
  healthcare: 'ヘルスケア',
  industrial: '工業',
  utilities: '公益',
  growth: 'グロース',
};

export const REGIME_SECTOR_GUIDANCE: Record<
  MarketRegimeId,
  { preferred: SectorTheme[]; avoid: SectorTheme[]; summaryJa: string }
> = {
  risk_on: {
    preferred: ['growth', 'technology', 'etf'],
    avoid: ['utilities'],
    summaryJa: 'リスク選好が高まりやすい環境。成長・テックに資金が向かいやすい。',
  },
  risk_off: {
    preferred: ['dividend', 'utilities', 'etf'],
    avoid: ['growth', 'technology'],
    summaryJa: '防御的配分が有利。ボラの高い銘柄は控えめに。',
  },
  inflation_fear: {
    preferred: ['energy', 'financial', 'dividend'],
    avoid: ['growth', 'technology'],
    summaryJa: '実物・金利敏感セクターが相対的に有利になりやすい。',
  },
  recession_fear: {
    preferred: ['dividend', 'consumer', 'healthcare'],
    avoid: ['industrial', 'growth'],
    summaryJa: '景気敏感セクターを避け、安定収益にシフト。',
  },
  liquidity_bull: {
    preferred: ['etf', 'growth', 'technology'],
    avoid: [],
    summaryJa: '流動性が株式を支えやすい。幅広いリスク資産が恩恵を受けやすい。',
  },
  tightening_bear: {
    preferred: ['dividend', 'utilities', 'financial'],
    avoid: ['growth', 'technology'],
    summaryJa: '金利上昇圧力下では成長株のバリュエーションが圧迫されやすい。',
  },
  recovery_phase: {
    preferred: ['industrial', 'financial', 'consumer'],
    avoid: ['utilities'],
    summaryJa: '景気敏感・景気後期セクターが回復トレードの対象になりやすい。',
  },
  high_volatility: {
    preferred: ['etf', 'dividend'],
    avoid: ['growth'],
    summaryJa: 'ボラ拡大時はポジションを小さく。分散・配当で守りを固める。',
  },
};

export const REGIME_RISK_MULTIPLIER: Record<MarketRegimeId, number> = {
  risk_on: 1.05,
  risk_off: 0.55,
  inflation_fear: 0.75,
  recession_fear: 0.6,
  liquidity_bull: 1.0,
  tightening_bear: 0.65,
  recovery_phase: 0.9,
  high_volatility: 0.5,
};
