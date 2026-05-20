export type MarketSessionStatus =
  | 'pre_open'
  | 'morning_session'
  | 'lunch_break'
  | 'afternoon_session'
  | 'after_close'
  | 'pre_market'
  | 'open'
  | 'after_market'
  | 'closed';

/** 次のマイルストーンまでのカウントダウン種別 */
export type SessionCountdownKind =
  | 'morning_open'
  | 'lunch_break'
  | 'afternoon_open'
  | 'market_close'
  | 'next_session'
  | 'pre_market_open'
  | 'regular_open'
  | 'extended_close';

export const SESSION_STATUS_LABEL: Record<MarketSessionStatus, string> = {
  pre_open: '開場前',
  morning_session: '前場取引中',
  lunch_break: '昼休み中',
  afternoon_session: '後場取引中',
  after_close: '閉場後',
  pre_market: 'プレマーケット',
  open: '取引中',
  after_market: 'アフターマーケット',
  closed: '休場',
};

export const SESSION_BEGINNER_TIPS: Record<MarketSessionStatus, string> = {
  pre_open: 'まだ取引は始まっていません。開場を待ちましょう。',
  morning_session: '前場：午前中の取引時間',
  lunch_break: '昼休み中：現在は一時的に取引停止中です',
  afternoon_session: '後場：午後の取引時間',
  after_close: '本日の取引は終了しました。',
  pre_market: 'プレマーケットでは値動きが不安定になることがあります。初心者の方は通常時間帯がおすすめです。',
  open: '通常の取引時間です。Rakuten Tradeで注文できます（本アプリは記録・練習のみ）。',
  after_market:
    'アフターマーケット（時間外）も流動性が低く、価格が大きく動くことがあります。十分注意してください。',
  closed: '取引所は休みです。注文は受け付けられないことが多いです。',
};

export const COUNTDOWN_PREFIX: Record<SessionCountdownKind, string> = {
  morning_open: '前場開始まで',
  lunch_break: '昼休みまで',
  afternoon_open: '後場開始まで',
  market_close: '閉場まで',
  next_session: '前場開始まで',
  pre_market_open: 'プレマーケット開始まで',
  regular_open: '通常取引開始まで',
  extended_close: '時間外終了まで',
};

export const CLOSED_TRADE_WARNING = '現在は通常取引時間外です。参考情報としてご利用ください。';

const ACTIVE_SESSION_STATUSES: MarketSessionStatus[] = ['morning_session', 'afternoon_session', 'open'];

const BLOCKED_TRADE_STATUSES: MarketSessionStatus[] = [
  'pre_open',
  'lunch_break',
  'after_close',
  'closed',
  'pre_market',
  'after_market',
];

export function isActiveTradingSession(status: MarketSessionStatus): boolean {
  return ACTIVE_SESSION_STATUSES.includes(status);
}

export function isBlockedTradingSession(status: MarketSessionStatus): boolean {
  return BLOCKED_TRADE_STATUSES.includes(status);
}

export function isExtendedHoursSession(status: MarketSessionStatus): boolean {
  return status === 'pre_market' || status === 'after_market';
}

export function alertKindFromCountdown(kind: SessionCountdownKind): 'open' | 'close' {
  switch (kind) {
    case 'morning_open':
    case 'afternoon_open':
    case 'regular_open':
    case 'next_session':
    case 'pre_market_open':
      return 'open';
    default:
      return 'close';
  }
}
