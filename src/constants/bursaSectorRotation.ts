import type { RotationIndicatorId, RotationSectorId } from '../types/bursaSectorRotation';

/** Phase19.5 — ローテーション対象9セクター */
export const ROTATION_SECTOR_LABEL_JA: Record<RotationSectorId, string> = {
  banking: 'Banking',
  utilities: 'Utilities',
  consumer: 'Consumer',
  energy: 'Energy',
  technology: 'Technology',
  industrial: 'Industrial',
  healthcare: 'Healthcare',
  reit: 'REIT',
  telecommunication: 'Telecommunication',
};

/** Phase19.5 — 算出要素（9指標） */
export const ROTATION_INDICATOR_IDS: RotationIndicatorId[] = [
  'fed_rate',
  'us10y',
  'usd_myr',
  'dxy',
  'brent_oil',
  'gold',
  'klci',
  'sp500',
  'nasdaq',
];

/**
 * セクター別ローテーション感応度
 * + = 指標がBullishのときセクター強化、- = 逆方向
 */
export const ROTATION_SECTOR_SENSITIVITY: Record<
  RotationSectorId,
  Partial<Record<RotationIndicatorId, number>>
> = {
  banking: {
    fed_rate: -1.2,
    us10y: -1.0,
    usd_myr: 0.5,
    dxy: 0.4,
    klci: 0.8,
    sp500: 0.6,
    nasdaq: 0.3,
    brent_oil: 0.2,
    gold: 0.2,
  },
  utilities: {
    fed_rate: 1.0,
    us10y: 1.0,
    usd_myr: 0.5,
    dxy: 0.4,
    klci: 0.7,
    sp500: 0.5,
    brent_oil: 0.6,
    gold: 0.3,
    nasdaq: 0.2,
  },
  consumer: {
    usd_myr: 0.9,
    dxy: 0.6,
    klci: 0.9,
    sp500: 0.7,
    nasdaq: 0.5,
    fed_rate: 0.7,
    us10y: 0.6,
    brent_oil: 0.7,
    gold: 0.4,
  },
  energy: {
    brent_oil: -1.2,
    dxy: 0.5,
    usd_myr: 0.4,
    klci: 0.6,
    sp500: 0.5,
    fed_rate: 0.4,
    us10y: 0.3,
    gold: 0.3,
    nasdaq: 0.3,
  },
  technology: {
    nasdaq: -1.0,
    sp500: -0.8,
    fed_rate: 1.0,
    us10y: 1.0,
    usd_myr: 0.5,
    dxy: 0.6,
    klci: 0.4,
    brent_oil: 0.3,
    gold: 0.3,
  },
  industrial: {
    klci: 0.8,
    sp500: 0.7,
    nasdaq: 0.5,
    usd_myr: 0.6,
    dxy: 0.5,
    us10y: 0.6,
    fed_rate: 0.5,
    brent_oil: 0.5,
    gold: 0.3,
  },
  healthcare: {
    sp500: 0.6,
    nasdaq: 0.5,
    klci: 0.6,
    fed_rate: 0.5,
    us10y: 0.5,
    usd_myr: 0.4,
    dxy: 0.3,
    gold: 0.4,
    brent_oil: 0.3,
  },
  reit: {
    us10y: 1.1,
    fed_rate: 1.0,
    usd_myr: 0.6,
    dxy: 0.5,
    klci: 0.7,
    sp500: 0.4,
    nasdaq: 0.3,
    brent_oil: 0.3,
    gold: 0.3,
  },
  telecommunication: {
    klci: 0.7,
    sp500: 0.5,
    nasdaq: 0.4,
    usd_myr: 0.5,
    dxy: 0.4,
    us10y: 0.5,
    fed_rate: 0.4,
    brent_oil: 0.3,
    gold: 0.2,
  },
};

/** 監査6銘柄 → ローテーションセクター */
export const AUDIT_STOCK_ROTATION_SECTOR: Record<string, RotationSectorId> = {
  '1155': 'banking',
  '1023': 'banking',
  '1295': 'banking',
  '5347': 'utilities',
  '4707': 'consumer',
  '6033': 'energy',
};

export const SECTOR_ROTATION_UNAVAILABLE_JA = 'データ未取得';
