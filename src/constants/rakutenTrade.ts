import type { AccountType, Currency, Market } from '../types';

/** Rakuten Trade Malaysia — reference rates for estimates only (manual trading) */

export const BROKER_NAME = 'Rakuten Trade Malaysia';

export const FX_TO_MYR: Record<Currency, number> = {
  MYR: 1,
  USD: 4.7,
  HKD: 0.6,
};

export const MARKET_LABEL: Record<Market, string> = {
  bursa: 'バルサ・マレーシア',
  us: '米国',
  hk: '香港',
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  MYR: 'RM',
  USD: '$',
  HKD: 'HK$',
};

export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  cash_upfront: 'Cash Upfront（現金前払い）',
  contra: 'Contra（デイトレード）',
  raku_margin: 'RakuMargin（信用）',
};

/** High-risk accounts — disabled by default */
export const HIGH_RISK_ACCOUNTS: AccountType[] = ['contra', 'raku_margin'];

export const ACCOUNT_TYPE_WARNING: Record<AccountType, string> = {
  cash_upfront: '利用可能な現金残高のみで取引します。Rakuten Tradeで手動注文してください。',
  contra: '当日決済のデイトレード口座です。損失拡大のリスクが非常に高く、本アプリでは無効化されています。',
  raku_margin: '信用取引口座です。レバレッジにより損失が拡大するリスクが非常に高く、本アプリでは無効化されています。',
};

/** Simplified brokerage fee estimates — verify on Rakuten Trade before trading */
export function estimateBrokerageFee(market: Market, tradeValue: number, currency: Currency) {
  let fee = 0;
  let note = '';

  switch (market) {
    case 'bursa':
      fee = Math.max(8, tradeValue * 0.001);
      note = 'バルサ概算: 最低RM8または約0.1%（実際の料金はRakuten Tradeで確認）';
      break;
    case 'us':
      fee = 1.88;
      note = '米国概算: 約USD1.88/注文（実際の料金はRakuten Tradeで確認）';
      break;
    case 'hk':
      fee = Math.max(15, tradeValue * 0.001);
      note = '香港概算: 最低HK$15または約0.1%（実際の料金はRakuten Tradeで確認）';
      break;
  }

  return { market, tradeValue, currency, estimatedFee: Number(fee.toFixed(2)), note };
}
