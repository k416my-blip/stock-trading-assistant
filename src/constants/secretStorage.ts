/** SecureStore / シークレット抽象層用キー（AsyncStorage の @sta/* とは別） */
export const SECRET_KEYS = {
  twelveDataApiKey: 'sta.secret.twelve_data_api_key',
  newsApiKey: 'sta.secret.news_api_key',
  snsApiKey: 'sta.secret.sns_api_key',
  redditApiKey: 'sta.secret.reddit_api_key',
  xApiKey: 'sta.secret.x_api_key',
  earningsApiKey: 'sta.secret.earnings_api_key',
  aiApiKey: 'sta.secret.ai_api_key',
} as const;

export type SecretKeyId = keyof typeof SECRET_KEYS;

/** レガシー平文保存（移行後は削除） */
export const LEGACY_PLAIN_SECRET_KEYS = {
  twelveDataApiKey: '@sta/twelve_data_api_key',
  newsApiKey: '@sta/news_api_key',
  snsApiKey: '@sta/sns_api_key',
  redditApiKey: '@sta/reddit_api_key',
  xApiKey: '@sta/x_api_key',
  earningsApiKey: '@sta/earnings_api_key',
  aiApiKey: '@sta/ai_api_key',
} as const;
