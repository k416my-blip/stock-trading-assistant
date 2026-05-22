import type { ValidationHorizon } from '../types/portfolioRealityValidation';

export const REALITY_INITIAL_CAPITAL_MYR = 100_000;
export const REALITY_MAX_RECOMMENDATIONS = 200;
export const REALITY_OVERTRADE_WINDOW_MS = 24 * 60 * 60 * 1000;
export const REALITY_OVERTRADE_MAX_ACTIONS = 8;
export const REALITY_THIN_REASON_MIN_LEN = 24;
export const REALITY_HUMAN_REVIEW_CONFIDENCE_MAX = 52;
export const REALITY_TRUST_PRESERVATION_THRESHOLD = 42;

export const HORIZON_MS: Record<ValidationHorizon, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
};

export const REALITY_AI_PROMPT_JA = `
【Portfolio Simulation & Reality Validation】
- AI提案は紙上ポートフォリオで追跡され、勝率・trustScore は実績ベース。自動売買はしない。
`.trim();

export const REALITY_UI_LABELS_JA = {
  panelTitle: 'AI Performance Center',
  winRate: 'AI勝率',
  recent: '最近の成功率',
  maxFail: '最大失敗',
  strongest: '最強戦略',
  dangerous: '危険戦略',
  trust: 'AI Trust Score',
  virtualPnl: '仮想損益',
  preservation: '守備モード',
} as const;
