import type { AccountType, Market, TechnicalSnapshot, TradeRecord } from '../types';

export const buySignalLabel: Record<TechnicalSnapshot['buySignal'], string> = {
  buy: '買いシグナル',
  hold: '様子見',
  wait: '買い待ち',
};

export const sellSignalLabel: Record<TechnicalSnapshot['sellSignal'], string> = {
  sell: '売りシグナル',
  hold: '保有継続',
  wait: '売り待ち',
};

export const volumeTrendLabel: Record<TechnicalSnapshot['volumeTrend'], string> = {
  rising: '増加',
  falling: '減少',
  flat: '横ばい',
};

export const tradeSideLabel: Record<TradeRecord['side'], string> = {
  buy: '買い',
  sell: '売り',
};

export const marketTabLabel: Record<Market, string> = {
  bursa: 'バルサ',
  us: '米国',
  hk: '香港',
};

export const accountTypeShortLabel: Record<AccountType, string> = {
  cash_upfront: 'Cash Upfront',
  contra: 'Contra',
  raku_margin: 'RakuMargin',
};
