import { STALE_QUOTE_MAX_AGE_MS } from './marketData';

/** 同一 idempotency バケット（重複送信防止ウィンドウ） */
export const EXECUTION_IDEMPOTENCY_WINDOW_MS = 120_000;

/** 執行ブロック — この経過秒数超で critically stale */
export const EXECUTION_CRITICAL_STALE_MS = STALE_QUOTE_MAX_AGE_MS;

export const EXECUTION_SAFETY_MESSAGES = {
  duplicateOrder: '同じ注文が処理中、または直近で送信済みです。しばらく待ってから再試行してください。',
  pendingLock: 'この銘柄の注文が処理中です。完了するまでお待ちください。',
  quoteUnavailable: '有効な価格がありません。価格を入力するか、株価更新後に再試行してください。',
  staleExecutionBlocked:
    '価格が古い（STALE）ため執行できません。最新の株価を取得してから再試行してください。',
  confirmationTitle: '注文内容の確認',
  confirmationPractice: '仮想取引を実行します。実際の証券口座では約定しません。',
  confirmationManual:
    'Rakuten Trade 等で約定済みの取引のみ記録してください。未約定の場合は記録しないでください。',
  uncertainStatus:
    '約定結果が不明です。執行ジャーナルで状態を確認し、必要なら照合画面で修正してください。',
  riskWarning:
    '投資には元本割れのリスクがあります。参考情報であり、利益を保証するものではありません。',
} as const;

export const TERMINAL_ORDER_STATUSES = [
  'confirmed',
  'failed',
  'cancelled',
  'reconciled',
] as const;

export const IN_FLIGHT_ORDER_STATUSES = ['draft', 'pending', 'submitted'] as const;
