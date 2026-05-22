import type { MacroWorldRegimeId } from '../types/macroIntelligence';

export const MACRO_INTEL_MAX_TIMELINE = 30;

export const MACRO_WORLD_REGIME_LABEL_JA: Record<MacroWorldRegimeId, string> = {
  risk_on: 'リスクオン',
  risk_off: 'リスクオフ',
  panic: 'パニック',
  liquidity_crisis: '流動性危機',
  inflation: 'インフレ圧力',
  recession: '景気後退',
  recovery: '回復',
  euphoric: '熱狂',
};

export const MACRO_INTEL_REGULATORY_BANNER_JA =
  'ルールベースのマクロ分析（参考情報）。推測・学習・自動売買は行いません。';

export const MACRO_INTEL_AI_PROMPT_JA = `
【Macro Intelligence & World Model — ルールベース】
- 世界状態は context.macroIntelligence のスコアと根拠のみ引用。推測で補完しない。
- 個別銘柄とマクロ要因を分離して説明する。
- panic / liquidity_crisis 時は defensive を優先し、買い候補の断定を避ける。
`.trim();

export const MACRO_INTEL_UI_LABELS_JA = {
  panelTitle: 'World State & Macro Intelligence',
  safety: 'ルールベース・ローカル',
  regime: '世界レジーム',
  macroScore: 'Macro Score',
  stress: 'ストレス',
  liquidity: '流動性',
  inflation: 'インフレ圧力',
  capitalFlow: '資金循環',
  narratives: '市場テーマ',
  riskRadar: '最大リスク',
  explain: 'レジーム判定の理由',
  heatmap: '地域ヒートマップ',
  correlations: '相関',
  fragility: '脆弱性',
} as const;

export const VIX_LIQUIDITY_CRISIS = 32;
export const VIX_PANIC_MACRO = 26;
export const FEAR_GREED_CAPITULATION = 22;
export const FEAR_GREED_EUPHORIA = 78;
