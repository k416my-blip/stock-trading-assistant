import type { SecretKeyId } from '../constants/secretStorage';

export type SupportedApiProviderId =
  | 'openai'
  | 'twelve_data'
  | 'newsapi'
  | 'x'
  | 'alpha_vantage'
  | 'finnhub'
  | 'polygon'
  | 'fmp';

export type ApiProviderDefinition = {
  id: SupportedApiProviderId;
  label: string;
  secretKeyId: SecretKeyId;
  placeholder: string;
  helpText: string;
};

export const API_PROVIDERS: ApiProviderDefinition[] = [
  {
    id: 'openai',
    label: 'OpenAI API',
    secretKeyId: 'aiApiKey',
    placeholder: 'OpenAI API key',
    helpText: 'models/responses で疎通確認します',
  },
  {
    id: 'twelve_data',
    label: 'Twelve Data API',
    secretKeyId: 'twelveDataApiKey',
    placeholder: 'Twelve Data API Key',
    helpText: 'AAPL quote で疎通確認します',
  },
  {
    id: 'newsapi',
    label: 'NewsAPI',
    secretKeyId: 'newsApiKey',
    placeholder: 'NewsAPI Key',
    helpText: 'business/us の headline 取得で確認します',
  },
  {
    id: 'x',
    label: 'X API',
    secretKeyId: 'xApiKey',
    placeholder: 'Bearer Token',
    helpText: 'users/me で疎通確認します',
  },
  {
    id: 'alpha_vantage',
    label: 'Alpha Vantage API',
    secretKeyId: 'alphaVantageApiKey',
    placeholder: 'Alpha Vantage API Key',
    helpText: 'GLOBAL_QUOTE IBM で確認します',
  },
  {
    id: 'finnhub',
    label: 'Finnhub API',
    secretKeyId: 'finnhubApiKey',
    placeholder: 'Finnhub API Key',
    helpText: 'AAPL quote で確認します',
  },
  {
    id: 'polygon',
    label: 'Polygon.io API',
    secretKeyId: 'polygonApiKey',
    placeholder: 'Polygon API Key',
    helpText: 'AAPL previous close で確認します',
  },
  {
    id: 'fmp',
    label: 'Financial Modeling Prep API',
    secretKeyId: 'fmpApiKey',
    placeholder: 'FMP API Key',
    helpText: 'stable/quote?symbol=AAPL で確認します（FMP公式）',
  },
];
