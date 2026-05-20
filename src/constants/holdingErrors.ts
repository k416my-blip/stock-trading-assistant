/** User-visible reasons when holdings cannot be updated */

export const HOLDING_ERRORS = {
  notPracticeMode: '練習モードではありません',
  manualAddLiveAnalysisOnly:
    '手動追加は実運用分析モードでご利用ください。練習モードでは仮想買付をお使いください。',
  noPrice: '価格データがありません',
  invalidQuantity: '数量が無効です',
  invalidExecutedPrice: '約定価格が無効です',
  invalidSymbol: '銘柄コードが無効です',
  orderNotFound: '手動注文が見つかりません',
  manualConfirmLiveAnalysisOnly:
    '実行済み記録は実運用分析モードでご利用ください。練習モードでは仮想売買をお使いください。',
  saveFailed: '保有銘柄の保存に失敗しました',
  liveAnalysisNoAutoBuy: '実運用分析モードでは自動追加されません',
  readOnlyMode: '読み取り専用モードのため追加できません',
  tradeSubmissionStopped: '取引入力が停止されています',
  insufficientCash: '現金残高が不足しています',
  insufficientShares: '保有株数が不足しています',
} as const;

export const LIVE_ANALYSIS_BUY_GUIDANCE_JA =
  '実運用分析モードでは実際の注文は証券会社アプリで行ってください。購入後、このアプリには手動で保有銘柄を追加できます。';

export const MANUAL_HOLDING_SUCCESS_JA = '保有銘柄に追加しました';
