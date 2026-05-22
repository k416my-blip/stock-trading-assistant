import type { AutonomousAggressiveness } from '../types/autonomousMonitoring';

export const AUTONOMOUS_MIN_SIGNALS: Record<AutonomousAggressiveness, number> = {
  conservative: 3,
  balanced: 2,
  aggressive: 2,
};

export const AUTONOMOUS_NOTIFY_SCORE_MIN: Record<AutonomousAggressiveness, number> = {
  conservative: 75,
  balanced: 65,
  aggressive: 55,
};

export const AUTONOMOUS_SILENT_SCORE_MAX = 45;

export const AUTONOMOUS_EMERGENCY_MARKET_RISK = 82;
export const AUTONOMOUS_EMERGENCY_FEAR = 78;

export const AUTONOMOUS_MAX_WATCHLIST = 24;
export const AUTONOMOUS_MAX_ATTENTION = 3;
export const AUTONOMOUS_MAX_SILENT_LOG = 40;

export const AUTONOMOUS_HIGH_VOL_CHANGE_PCT = 3.5;
export const AUTONOMOUS_HIGH_VOL_BETA_PROXY = 1.35;

export const AUTONOMOUS_AI_PROMPT_JA = `
【自律監視エージェント】
- ユーザー未操作でも市場を監視し、複合シグナル（価格・出来高・センチメント・ニュース・レジーム）が揃った重要変化のみ通知する。
- 単一要素だけでは通知しない方針を守る。
- 全通知に notificationWhyJa（なぜ通知したか）を必ず含める。
`.trim();

export const AUTONOMOUS_LABELS_JA = {
  panelTitle: '自律監視エージェント',
  attention: '今いちばん重要',
  heatmap: 'ウォッチリスト・ヒートマップ',
  stress: 'ポートフォリオ・ストレス',
  narrative: '市場ナラティブ',
  daily: '朝のブリーフィング',
  night: '夜のレビュー',
  emergency: '緊急モード',
  silent: 'サイレント監視中',
  resource: 'リソース保護',
} as const;
