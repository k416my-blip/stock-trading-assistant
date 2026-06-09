/** AI Concierge — user-facing Japanese UI copy */

import {
  AI_ANALYSIS_SYSTEM_NOTICE_JA,
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
  ORDER_EXECUTION_NOTICE_JA,
} from './platformClarification';

export const AI_CONCIERGE_UI = {
  chatDeleteConfirm: '選択したチャットを削除しますか？',
  chatSelectAll: '全選択',
  chatDelete: '削除',
  chatCancelSelection: 'キャンセル',
  chatSpeak: '読み上げ',
  chatStopSpeak: '停止',
  fabLabel: 'AIコンシェルジュを開く',
  panelTitle: 'AIコンシェルジュ',
  panelSubtitle: '分析支援 · 戦略・システムガイド · 全画面から利用可能',
  analysisNotice: AI_ANALYSIS_SYSTEM_NOTICE_JA,
  platformDisclaimer: ANALYSIS_SUPPORT_DISCLAIMER_JA,
  orderNotice: ORDER_EXECUTION_NOTICE_JA,
  close: '閉じる',
  systemStatus: 'システム状態',
  marketRegime: '相場レジーム',
  riskMode: 'リスクモード',
  quickActions: 'クイック質問',
  voiceInput: '音声入力',
  voiceListening: '聞き取り中…',
  voiceUnavailable: '音声入力はこの環境では利用できません。テキストで入力してください。',
  voicePermissionDenied: 'マイクの許可がありません。設定から許可するか、テキストで入力してください。',
  voiceError: '音声認識に失敗しました。もう一度お試しください。',
  openFromHome: '右下のAIボタンからいつでも会話できます',
  composingAnswer: '回答を作成中...',
  statusSlow: '処理中・少し時間がかかっています',
  statusTimeout: 'タイムアウトしました',
  statusThinking: '考え中…',
  statusRetrying: '再試行中…',
  statusReconnecting: '再接続中…',
  statusDegraded: '制限モードで応答中…',
  statusStreaming: '回答を表示中…',
  statusInstant: '即時回答',
} as const;

export type AiConciergeMode = 'operation' | 'strategy' | 'system' | 'portfolio' | 'general';

export const AI_CONCIERGE_MODE_LABELS: Record<AiConciergeMode, string> = {
  operation: '操作説明',
  strategy: '戦略',
  system: 'システム',
  portfolio: 'ポートフォリオ',
  general: '一般',
};

export const AI_CONCIERGE_QUICK_ACTIONS: Record<
  Exclude<AiConciergeMode, 'general'>,
  readonly string[]
> = {
  operation: [
    '健全性チェックとは？',
    '制限モード（劣化モード）とは？',
    'stale data（古い株価）とは？',
    '読み取り専用モードとは？',
  ],
  strategy: [
    'なぜ買い推奨？',
    'なぜ信頼度が低下？',
    '今の市場リスクは？',
    '推奨が変わった理由は？',
  ],
  system: [
    'なぜ更新が停止？',
    'API quota状況は？',
    '診断ログの意味は？',
    'キューが混雑している理由は？',
  ],
  portfolio: [
    '保有バランスは危険？',
    'セクター偏りは？',
    '古い株価の銘柄は？',
    '執行照合の注意点は？',
  ],
};
