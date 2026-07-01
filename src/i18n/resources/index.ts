import jaCommon from './ja/common.json';
import jaNavigation from './ja/navigation.json';
import jaHome from './ja/home.json';
import jaPortfolio from './ja/portfolio.json';
import jaStockCheck from './ja/stockCheck.json';
import jaConcierge from './ja/concierge.json';
import jaSettings from './ja/settings.json';
import jaRakutenImport from './ja/rakutenImport.json';
import jaErrors from './ja/errors.json';
import jaAlerts from './ja/alerts.json';
import jaGlossary from './ja/glossary.json';

import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enHome from './en/home.json';
import enPortfolio from './en/portfolio.json';
import enStockCheck from './en/stockCheck.json';
import enConcierge from './en/concierge.json';
import enSettings from './en/settings.json';
import enRakutenImport from './en/rakutenImport.json';
import enErrors from './en/errors.json';
import enAlerts from './en/alerts.json';
import enGlossary from './en/glossary.json';

import zhCommon from './zh-Hans/common.json';
import zhNavigation from './zh-Hans/navigation.json';
import zhHome from './zh-Hans/home.json';
import zhPortfolio from './zh-Hans/portfolio.json';
import zhStockCheck from './zh-Hans/stockCheck.json';
import zhConcierge from './zh-Hans/concierge.json';
import zhSettings from './zh-Hans/settings.json';
import zhRakutenImport from './zh-Hans/rakutenImport.json';
import zhErrors from './zh-Hans/errors.json';
import zhAlerts from './zh-Hans/alerts.json';
import zhGlossary from './zh-Hans/glossary.json';

const jaBundle = {
  common: jaCommon,
  navigation: jaNavigation,
  home: jaHome,
  portfolio: jaPortfolio,
  stockCheck: jaStockCheck,
  concierge: jaConcierge,
  settings: jaSettings,
  rakutenImport: jaRakutenImport,
  errors: jaErrors,
  alerts: jaAlerts,
  glossary: jaGlossary,
} as const;

const enBundle = {
  common: enCommon,
  navigation: enNavigation,
  home: enHome,
  portfolio: enPortfolio,
  stockCheck: enStockCheck,
  concierge: enConcierge,
  settings: enSettings,
  rakutenImport: enRakutenImport,
  errors: enErrors,
  alerts: enAlerts,
  glossary: enGlossary,
} as const;

const zhHansBundle = {
  common: zhCommon,
  navigation: zhNavigation,
  home: zhHome,
  portfolio: zhPortfolio,
  stockCheck: zhStockCheck,
  concierge: zhConcierge,
  settings: zhSettings,
  rakutenImport: zhRakutenImport,
  errors: zhErrors,
  alerts: zhAlerts,
  glossary: zhGlossary,
} as const;

/** zh / zh-CN aliases share zh-Hans bundles so i18next resolves any Chinese tag. */
export const i18nResources = {
  ja: jaBundle,
  en: enBundle,
  'zh-Hans': zhHansBundle,
  zh: zhHansBundle,
  'zh-CN': zhHansBundle,
} as const;
