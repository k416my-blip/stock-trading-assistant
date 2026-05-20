import type { AiSuggestedAction, AiUrgency } from '../types/aiStrategyBriefing';

export const AI_SAFE_ACTION_LABEL: Record<AiSuggestedAction, string> = {
  suggested_buy: '買い推奨',
  suggested_reduce: '売却検討',
  suggested_hold: '保有推奨',
  watch_closely: '要注視',
};

export const AI_URGENCY_LABEL: Record<AiUrgency, string> = {
  low: '低',
  medium: '中',
  high: '高',
  critical: '緊急',
};

export const AI_PERSONAL_SAFETY_FOOTER =
  'これは個人利用の分析補助です。最終判断はユーザー自身が行ってください。';

export const AI_BRIEFING_DISCLAIMER =
  '個人利用 · モックAI（分析参考のみ）。助言ではありません。証券連携・自動売買なし。';

export const AI_CHAT_TITLE = 'AI戦略アシスタント';

export const AI_SAMPLE_QUESTIONS = [
  'なぜ買い推奨？',
  'なぜ売却検討？',
  '緊急性は？',
  '今のリスクは？',
  '保有すべき？',
] as const;

export const AI_UI = {
  intelligencePanelTitle: 'AI戦略アシスタント',
  intelligencePanelSubtitle: '自己修復型AI投資支援 — システム全体の知性層',
  systemConfidence: 'システム信頼度',
  dataConfidence: 'データ鮮度',
  executionConfidence: '執行安全',
  recoveryConfidence: 'リカバリ',
  topRecommendations: '優先提案',
  systemHealth: 'システムヘルス',
  degradedWarning: '劣化モード — 信頼度は制限されています',
  briefingTitle: 'AI戦略ブリーフィング',
  briefingSubtitle: '個人利用 · 閲覧専用モック',
  marketRegime: 'マーケットレジーム',
  topSuggestions: '主な提案',
  riskMode: 'リスク',
  nextMacroEvent: '次のマクロイベント',
  tradeQueueTitle: 'AI取引キュー',
  tradeQueueSubtitle: 'モック一覧 · カードをタップで詳細',
  judgment: '判断',
  confidence: '信頼度',
  urgency: '緊急性',
  reason: '理由',
  dataFreshness: 'データ鮮度',
  viewExplanation: '詳細を見る',
  modalTitle: 'AI提案の詳細',
  modalTechnical: 'テクニカル',
  modalMacro: 'マクロ',
  modalRisk: 'リスク',
  modalFreshness: 'データ鮮度',
  close: '閉じる',
  acknowledgeSignal: '確認済み',
  acknowledgeSignalAction: '確認済みにする',
  acknowledgedSignal: '確認済み',
  queueAckUnconfirmed: '未確認',
  queueAckExpired: '期限切れ',
  queueAckDisabled: '無効化',
  signalStatus: '状態',
  signalOccurred: '発生',
  signalDeadline: '期限',
  showDisabledSignals: '無効化を表示',
  hideDisabledSignals: '無効化を隠す',
  acknowledgedToast: '確認済みにしました',
  acknowledgedHistoryTitle: '確認済みの履歴',
  acknowledgedHistoryExpand: '確認済みを表示',
  acknowledgedHistoryCollapse: '確認済みを隠す',
  unacknowledgedBadge: '未確認',
  chatHint: 'テキスト分析補助 · 音声・動画なし · 自動売買なし',
  sampleQuestions: 'サンプル質問',
  send: '送信',
  sending: '送信中…',
  chatInputPlaceholder: '銘柄や方針を入力（例: 1155 はどう？）',
  userLabel: 'あなた',
  assistantLabel: 'AI',
  personalAssistBadge: '個人利用の分析補助',
  apiStatus: 'API接続',
  mockFallback: 'モック応答に切替中',
  staleDataWarning: '古い株価データがあります。判断前に価格更新を確認してください。',
  conclusion: '結論',
  followUp: '確認事項',
} as const;
