import type { AlertType, NotificationSettings, NotificationSound } from '../types';

export const NOTIFICATION_COOLDOWN_MS = 30 * 60 * 1000;
export const MARKET_ALERT_LEAD_MS = 30 * 60 * 1000;
export const PRICE_ALERT_PROXIMITY_PCT = 2;
export const NOTIFICATION_HISTORY_MAX = 50;
export const ALERT_MONITOR_INTERVAL_MS = 5 * 60 * 1000;

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  notifyBuyCandidate: true,
  notifySellCandidate: true,
  notifyStopLoss: true,
  notifyTakeProfit: true,
  notifyMarketOpenBefore: true,
  notifyMarketCloseBefore: false,
  sound: 'default',
  vibrationEnabled: true,
};

export const NOTIFICATION_SOUND_LABEL: Record<NotificationSound, string> = {
  default: '標準音',
  bell: 'ベル',
  chime: 'チャイム',
  warning: '警告音',
  silent: '無音',
};

export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  allocation_plan: 'おすすめ配分プラン',
  buy_candidate: '買付候補',
  sell_candidate: '売却候補',
  stop_loss_near: '損切り推奨',
  take_profit_near: '利確推奨',
  market_open_bursa: 'Bursa 開場前',
  market_open_us: '米国 開場前',
  market_open_hk: '香港 開場前',
  market_close_bursa: 'Bursa 閉場前',
  market_close_us: '米国 閉場前',
  market_close_hk: '香港 閉場前',
};

export const ALERT_TITLE: Record<AlertType, string> = {
  allocation_plan: 'おすすめ配分プランができました',
  buy_candidate: '買付候補が出ました',
  sell_candidate: '売却候補が出ました',
  stop_loss_near: '損切りラインに近づいています',
  take_profit_near: '利確ラインに近づいています',
  market_open_bursa: 'Bursa Malaysia市場がもうすぐ始まります',
  market_open_us: '米国市場がもうすぐ始まります',
  market_open_hk: '香港市場がもうすぐ始まります',
  market_close_bursa: 'Bursa Malaysia市場がもうすぐ終わります',
  market_close_us: '米国市場がもうすぐ終わります',
  market_close_hk: '香港市場がもうすぐ終わります',
};

export const NOTIFICATION_BEGINNER_NOTE =
  '通知は売買を自動で行うものではありません。実際の注文はRakuten Tradeで自分で確認して行ってください。';

export const NOTIFICATION_DISCLAIMER =
  'この通知は売買を保証するものではありません。参考情報としてご利用ください。';

export const CUSTOM_SOUND_NOTE =
  'カスタム通知音はAPK化または開発ビルド後に有効になります。assets/sounds/ に bell.wav・chime.wav・warning.wav を配置してください。';
