/**
 * Platform positioning — AI investment OS / decision-support only.
 * No broker API, no live automated trading, no unofficial automation.
 */

/** Non-practice mode label (formerly 手動売買モード / 本番モード). */
export const APP_MODE_LIVE_ANALYSIS_LABEL = '実運用分析モード';

export const APP_MODE_PRACTICE_LABEL = '練習モード';

export const PLATFORM_POSITIONING_TITLE_JA = 'AI投資オペレーティングシステム';

export const PLATFORM_POSITIONING_SUBTITLE_JA =
  '分析・戦略提案・ポートフォリオ追跡 · 意思決定支援（証券会社での注文は別途）';

export const ORDER_EXECUTION_NOTICE_JA =
  '実際の注文は証券会社アプリ側で実行してください';

export const ANALYSIS_SUPPORT_DISCLAIMER_JA =
  'このアプリは投資判断を補助する分析ツールです。実際の注文はRakuten Tradeなどの証券会社アプリでユーザー自身が行ってください。';

export const AI_ANALYSIS_SYSTEM_NOTICE_JA =
  '現在は分析支援システムとして動作しています';

export const SUPPORTED_CAPABILITIES_JA = [
  'AI分析・戦略提案',
  'ポートフォリオ追跡',
  '練習取引（シミュレーション）',
  '執行シミュレーション・リスク管理',
  '緊急度分析・照合・診断',
] as const;

export const NOT_SUPPORTED_CAPABILITIES_JA = [
  'Rakuten Trade 等への直接注文執行',
  'ブローカーAPIによる自動売買',
  'ライブ自動取引・証券会社連携執行',
  '非公式スクレイピング・非公式自動化',
] as const;

export const FUTURE_LIVE_TRADING_NOTE_JA = `将来のライブ執行連携には、公式ブローカーAPI・認証・ブローカー側確認・規制レビューが必要です。現バージョンでは実装していません。`;

export const LIVE_ANALYSIS_MODE_DESCRIPTION_JA =
  '実運用分析モードでは、証券会社で約定した取引を記録し、AI分析・リスク診断・執行安全シミュレーションを利用します。注文は本アプリから送信されません。';

export const PRACTICE_MODE_DESCRIPTION_JA =
  '練習モードは仮想資金のシミュレーション専用です。実資金・証券会社連携はありません。';

/** World-model / AI context label for manual app mode */
export const APP_MODE_CONTEXT_LABEL_LIVE_ANALYSIS = '実運用分析';
