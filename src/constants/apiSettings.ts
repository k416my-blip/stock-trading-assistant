/** APIキー設定画面 — 表示文言 */

export const API_KEY_SETTINGS = {
  needKeyHint: '実運用分析には OpenAI と Twelve Data の登録を推奨します',
  getKeyButton: 'Twelve Data キー取得',
  openSettingsButton: '⚙ APIキー設定',
  settingsHubTitle: '設定',
  twelveDataUrl: 'https://twelvedata.com',
  openAiUrl: 'https://platform.openai.com/api-keys',
  finnhubUrl: 'https://finnhub.io/register',
  beginnerSteps:
    '① 必須API（OpenAI · Twelve Data）を登録 → ② 任意APIは必要なものだけ追加',
  requiredSectionTitle: '【必須】',
  requiredSectionNote:
    'AIコンシェルジュと保有銘柄の株価更新に使用します。未設定だと主要機能が動作しません。',
  optionalSectionTitle: '【任意】',
  optionalSectionNote:
    '未設定でもアプリは動作します（RSS · 参考推定 · フォールバックあり）。X API は Settings の X API と同一です（SNS 欄は廃止）。',
  openAiHint: 'OpenAI 形式の API キー。AIコンシェルジュ · 材料要約に使用。',
  twelveDataHint:
    'Twelve Data の無料 API キー。キーは端末 SecureStore にのみ保存されます。',
  newsApiHint: 'NewsAPI.org。未設定時は Yahoo / Google / Bursa RSS で代替。',
  redditHint:
    'Reddit OAuth Bearer（任意）。未設定でも Reddit RSS で材料分析できます。',
  finnhubHint:
    'Finnhub トークン。決算コール · アナリストコンセンサス · 企業ニュースに使用。',
  xApiHint:
    'X Developer Portal の Bearer Token（Bearer 接頭辞不要）。402 はプラン制限で、キー保存自体は可能です。',
} as const;
