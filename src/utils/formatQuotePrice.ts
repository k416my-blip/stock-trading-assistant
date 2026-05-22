import { formatFixed } from './safeNumeric';

/** 株価表示（小数2〜3桁） */
export function formatQuotePriceDisplay(
  price: number,
  currencySymbol = 'RM',
  digits = 2,
): string {
  return `${currencySymbol} ${formatFixed(price, digits)}`;
}
