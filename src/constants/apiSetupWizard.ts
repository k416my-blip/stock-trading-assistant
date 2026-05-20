import type { ApiProviderId } from '../types/apiSetup';

export const API_SETUP_WIZARD = {
  screenTitle: 'API設定ウィザード',
  screenSubtitle: '取得支援 · 手動登録 · 自動検証',
  safetyNotice:
    'APIキーは端末のSecureStoreにのみ保存します。自動生成・利用規約の自動同意・CAPTCHA突破・非公式スクレイピング・OAuthの自動操作は行いません。',
  openPortalButton: '取得ページを開く',
  saveAndVerifyButton: '保存して接続確認',
  verifyButton: '接続確認',
  showKey: '表示',
  hideKey: '非表示',
  keyPlaceholder: 'APIキーを貼り付け',
  healthDashboardTitle: 'APIヘルス',
  healthDashboardHint: 'AIコンシェルジュが参照する接続状態の要約です（キー本体は含みません）。',
  currentSelection: '現在の状態',
} as const;

export const API_HEALTH_STATUS_LABELS_JA: Record<
  import('../types/apiSetup').ApiHealthStatus,
  string
> = {
  unconfigured: '未設定',
  connecting: '接続中',
  ok: '接続正常',
  rate_limited: '制限中',
  error: '接続失敗',
};

export const API_VERIFICATION_RESULT_LABELS_JA: Record<
  import('../types/apiSetup').ApiVerificationOutcome,
  string
> = {
  unconfigured: '未設定',
  success: '接続成功',
  invalid_key: 'APIキー無効',
  rate_limited: 'quota制限',
  timeout: 'timeout',
  connection_error: '接続エラー',
  parse_error: '応答形式エラー',
};

export type ApiWizardProviderConfig = {
  id: ApiProviderId;
  nameJa: string;
  descriptionJa: string;
  portalUrl: string;
  secretKeyId: import('../constants/secretStorage').SecretKeyId;
  keyHintJa: string;
  optional: boolean;
};

export const API_WIZARD_PROVIDERS: readonly ApiWizardProviderConfig[] = [
  {
    id: 'openai',
    nameJa: 'OpenAI',
    descriptionJa: 'AIコンシェルジュ · 戦略アシスタント（OpenAI互換API）',
    portalUrl: 'https://platform.openai.com/api-keys',
    secretKeyId: 'aiApiKey',
    keyHintJa: 'OpenAI 形式のキーを公式ページで取得し、貼り付けてください。',
    optional: false,
  },
  {
    id: 'news',
    nameJa: 'News API',
    descriptionJa: 'ニュース感情分析（任意）',
    portalUrl: 'https://newsapi.org/register',
    secretKeyId: 'newsApiKey',
    keyHintJa: 'NewsAPI.org の APIキー。未設定時は参考推定です。',
    optional: true,
  },
  {
    id: 'earnings',
    nameJa: 'Financial / Earnings API',
    descriptionJa: '決算・ファンダメンタル補助（任意 · Finnhub互換）',
    portalUrl: 'https://finnhub.io/register',
    secretKeyId: 'earningsApiKey',
    keyHintJa: 'Finnhub 等のトークン。未設定時は参考推定です。',
    optional: true,
  },
  {
    id: 'reddit',
    nameJa: 'Reddit API',
    descriptionJa: 'Reddit話題分析（任意 · 手動取得したBearerトークン）',
    portalUrl: 'https://www.reddit.com/prefs/apps',
    secretKeyId: 'redditApiKey',
    keyHintJa:
      'Reddit Developer Portalで取得したアクセストークン（Bearer）を貼り付け。OAuthの自動取得は行いません。',
    optional: true,
  },
  {
    id: 'x',
    nameJa: 'X API',
    descriptionJa: 'X（旧Twitter）話題分析（任意）',
    portalUrl: 'https://developer.x.com/en/portal/dashboard',
    secretKeyId: 'xApiKey',
    keyHintJa: 'X Developer PortalのBearerトークン。未設定時は参考推定です。',
    optional: true,
  },
] as const;

export const API_PROVIDER_IDS: readonly ApiProviderId[] = API_WIZARD_PROVIDERS.map((p) => p.id);
