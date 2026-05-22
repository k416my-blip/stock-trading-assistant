import type { BrokerId, DeploymentEnvironment } from '../types/paperBroker';

/** 絶対条件 — 本番でもデフォルト false・コードで実API送信なし */
export const REAL_TRADING_ENABLED_DEFAULT = false as const;

export const PAPER_INITIAL_CAPITAL_MYR = 100_000;
export const PAPER_DEFAULT_ACCOUNT_ID = 'paper-primary';
export const PAPER_MAX_ORDERS_STORED = 300;
export const PAPER_MAX_JOURNAL = 120;

export const DEFAULT_DEPLOYMENT_ENV: DeploymentEnvironment = 'simulation';

export const DEFAULT_ACTIVE_BROKER: BrokerId = 'mock_paper';

export const PAPER_MAX_DRAWDOWN_PCT = 18;
export const PAPER_MAX_SYMBOL_EXPOSURE_PCT = 35;
export const PAPER_MAX_SECTOR_EXPOSURE_PCT = 55;
export const PAPER_COOLDOWN_MS = 20 * 60 * 1000;
export const PAPER_MAX_ORDERS_PER_HOUR = 12;
export const PAPER_REVENGE_WINDOW_MS = 30 * 60 * 1000;

export const PAPER_COMMISSION_BPS = 8;
export const PAPER_BASE_SLIPPAGE_BPS = 6;
export const PAPER_BASE_LATENCY_MS = 120;

export const REGULATORY_SAFETY_BANNER_JA =
  '参考情報のみ — 本アプリは証券会社への実注文を送信しません。すべて紙上（シミュレーション）です。';

export const EXECUTION_UI_LABELS_JA = {
  panelTitle: 'Execution Dashboard',
  regulatory: '規制・安全',
  orders: '注文',
  pnl: '損益',
  exposure: 'エクスポーザー',
  drawdown: '最大DD',
  winRate: '勝率',
  sharpe: 'Sharpe（推定）',
  latency: '執行レイテンシ',
  trust: 'Trust Score',
  killSwitch: 'キルスイッチ',
  paperOnly: '紙上取引のみ',
} as const;

export const BROKER_LABELS_JA: Record<BrokerId, string> = {
  mock_paper: 'Paper（内蔵モック）',
  ibkr: 'IBKR（モック）',
  alpaca: 'Alpaca（モック）',
  rakuten: '楽天証券（プレースホルダー）',
  bursa: 'Bursa（プレースホルダー）',
};

export const PAPER_AI_PROMPT_JA = `
【Paper Trading & Broker Integration】
- realTradingEnabled=false。実注文・ブローカーAPI送信は禁止。紙上シミュレーションのみ。
`.trim();
