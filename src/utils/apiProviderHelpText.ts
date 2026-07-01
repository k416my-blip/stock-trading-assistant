import type { TFunction } from 'i18next';
import type { SupportedApiProviderId } from '../config/apiProviders';

const HELP_KEY: Record<SupportedApiProviderId, string> = {
  openai: 'apiProviders.openai.helpText',
  twelve_data: 'apiProviders.twelve_data.helpText',
  newsapi: 'apiProviders.newsapi.helpText',
  x: 'apiProviders.x.helpText',
  reddit: 'apiProviders.reddit.helpText',
  alpha_vantage: 'apiProviders.alpha_vantage.helpText',
  finnhub: 'apiProviders.finnhub.helpText',
  polygon: 'apiProviders.polygon.helpText',
  fmp: 'apiProviders.fmp.helpText',
};

export function getApiProviderHelpText(
  providerId: SupportedApiProviderId,
  t: TFunction<'settings'>,
): string {
  const key = HELP_KEY[providerId];
  return key ? t(key) : providerId;
}
