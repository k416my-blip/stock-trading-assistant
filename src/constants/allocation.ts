import type { InvestmentStyle, RiskLevel } from '../types';

export const RISK_LEVEL_LABEL: Record<RiskLevel, string> = {
  low: '低リスク',
  standard: '標準',
  high: '高リスク',
};

/** 画面表示用（初心者向け名称） */
export const INVESTMENT_STYLE_LABEL: Record<InvestmentStyle, string> = {
  dividend: '安全運用',
  balanced: '標準運用',
  growth: '成長重視',
  short_term: '短期勝負',
};

export const ALLOCATION_PLAN_DISCLAIMER =
  'これは参考プランです。「必ず買うべき」銘柄ではありません。投資判断を保証するものではありません。実際の売買はRakuten Tradeで自分で確認して行ってください。';

export const CANNOT_BUY_ONE_SHARE_WARNING = 'この金額では1株購入できません';

export const ALLOCATION_PRACTICE_MESSAGES = {
  insufficientCash: '仮想資金が不足しています',
  noBuyable: 'この金額では購入できる銘柄がありません',
  partialSkip: '一部の銘柄は1株未満のため除外しました',
  bulkBuyComplete: '一括仮想買付が完了しました',
  buyFailed: '仮想買付に失敗しました',
  saveFailed: '保有データ保存エラー',
  noValidCandidates: '有効な購入候補がありません',
  practiceModeRequired: '練習モードでのみ一括仮想買付できます。設定から練習モードに切り替えてください。',
} as const;

export const ALLOCATION_BULK_BUY_LABEL = 'この配分で一括仮想買付';
export const ALLOCATION_BULK_BUY_LOADING_LABEL = '一括仮想買付中…';
export const ALLOCATION_MANUAL_LIST_LABEL = '手動注文リストに追加';

export const FRACTIONAL_SHARES_HINT =
  'ON：端株（小数株）を想定した目安株数を表示します。OFF：1株単位のみ（0株の候補は出しません）。Rakuten Tradeの取扱いはご自身で確認してください。';
