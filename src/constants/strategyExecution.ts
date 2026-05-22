import type { ConciergeMarketRegimeId } from '../types/globalMarketAnalysis';
import type { TacticalMode } from '../types/strategyExecution';

export const STRATEGY_ACTION_LABELS_JA: Record<
  import('../types/strategyExecution').StrategyAction,
  string
> = {
  buy: '買い検討',
  reduce: '減らす',
  hold: '保有継続',
  avoid: '回避',
  watch: '様子見',
};

export const TACTICAL_MODE_LABELS_JA: Record<TacticalMode, string> = {
  defensive: '守り',
  balanced: '標準',
  aggressive: '積極',
};

export const STRATEGY_COOLDOWN_MS = 45 * 60 * 1000;
export const STRATEGY_MAX_ACTION_PROPOSALS_PER_WINDOW = 4;

export const STRATEGY_AI_PROMPT_JA = `
【Strategy Execution — 具体的アクション】
- buy / reduce / hold / avoid / watch と confidence を提示済み。自動売買はしない。
- watch（面白い）と action（実際に検討）を分離して説明する。
`.trim();

export const STRATEGY_UI_LABELS_JA = {
  panelTitle: 'AI Action Center',
  today: '今日の推奨',
  danger: '危険回避',
  watch: '様子見',
  highExpectancy: '高期待値',
  cash: '現金比率提案',
  confidence: 'AI confidence',
  allocation: '配分',
  macro: 'マクロ',
  journal: '戦略ジャーナル',
} as const;

export function regimeStrategyJa(regimeId: ConciergeMarketRegimeId | 'unknown'): string {
  switch (regimeId) {
    case 'panic':
    case 'risk_off':
      return '守り優先 — 新規は極小、現金・減らしを優先';
    case 'bullish':
    case 'risk_on':
      return '選別的な買い — 利確ルールを先に固定';
    case 'sideways':
      return 'レンジ — 様子見と部分利確、集中回避';
    default:
      return '標準 — 分散と損切りルールを維持';
  }
}

export const POSITION_SIZE_BY_TACTICAL: Record<
  TacticalMode,
  { conservative: number; standard: number; aggressive: number }
> = {
  defensive: { conservative: 2, standard: 4, aggressive: 6 },
  balanced: { conservative: 3, standard: 6, aggressive: 10 },
  aggressive: { conservative: 5, standard: 10, aggressive: 15 },
};
