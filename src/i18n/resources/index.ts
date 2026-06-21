import jaCommon from './ja/common.json';
import jaNavigation from './ja/navigation.json';
import jaHome from './ja/home.json';
import jaPortfolio from './ja/portfolio.json';
import jaStockCheck from './ja/stockCheck.json';
import jaConcierge from './ja/concierge.json';
import jaSettings from './ja/settings.json';
import jaRakutenImport from './ja/rakutenImport.json';
import jaErrors from './ja/errors.json';

import enCommon from './en/common.json';
import enNavigation from './en/navigation.json';
import enHome from './en/home.json';
import enPortfolio from './en/portfolio.json';
import enStockCheck from './en/stockCheck.json';
import enConcierge from './en/concierge.json';
import enSettings from './en/settings.json';
import enRakutenImport from './en/rakutenImport.json';
import enErrors from './en/errors.json';

import zhCommon from './zh-Hans/common.json';
import zhNavigation from './zh-Hans/navigation.json';
import zhHome from './zh-Hans/home.json';
import zhPortfolio from './zh-Hans/portfolio.json';
import zhStockCheck from './zh-Hans/stockCheck.json';
import zhConcierge from './zh-Hans/concierge.json';
import zhSettings from './zh-Hans/settings.json';
import zhRakutenImport from './zh-Hans/rakutenImport.json';
import zhErrors from './zh-Hans/errors.json';

export const i18nResources = {
  ja: {
    common: jaCommon,
    navigation: jaNavigation,
    home: jaHome,
    portfolio: jaPortfolio,
    stockCheck: jaStockCheck,
    concierge: jaConcierge,
    settings: jaSettings,
    rakutenImport: jaRakutenImport,
    errors: jaErrors,
  },
  en: {
    common: enCommon,
    navigation: enNavigation,
    home: enHome,
    portfolio: enPortfolio,
    stockCheck: enStockCheck,
    concierge: enConcierge,
    settings: enSettings,
    rakutenImport: enRakutenImport,
    errors: enErrors,
  },
  'zh-Hans': {
    common: zhCommon,
    navigation: zhNavigation,
    home: zhHome,
    portfolio: zhPortfolio,
    stockCheck: zhStockCheck,
    concierge: zhConcierge,
    settings: zhSettings,
    rakutenImport: zhRakutenImport,
    errors: zhErrors,
  },
} as const;
