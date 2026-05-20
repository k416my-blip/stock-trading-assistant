import { SAMPLE_STOCKS, getSamplePriceHistory } from '../data/sampleStocks';
import type { PriceBar, StockFundamentals } from '../types';
import type { MarketIndicatorsSnapshot, SectorTheme } from '../types/marketRegime';
import { analyzeTechnicals } from './technicalAnalysis';

const PROXY = {
  usBreadth: 'SCHD',
  usGrowth: 'INTC',
  usDefensive: 'KO',
  usFinancial: 'BAC',
  bursaIndex: '0820EA',
  oilEnergy: '5183',
  hkProxy: '0700',
} as const;

function returnPct(bars: PriceBar[]): number {
  if (bars.length < 2) return 0;
  const first = bars[0].close;
  const last = bars[bars.length - 1].close;
  return first > 0 ? ((last - first) / first) * 100 : 0;
}

function volatilityPct(bars: PriceBar[]): number {
  if (bars.length < 5) return 15;
  const rets: number[] = [];
  for (let i = 1; i < bars.length; i++) {
    if (bars[i - 1].close > 0) {
      rets.push(((bars[i].close - bars[i - 1].close) / bars[i - 1].close) * 100);
    }
  }
  const mean = rets.reduce((a, b) => a + b, 0) / Math.max(rets.length, 1);
  const variance = rets.reduce((s, r) => s + (r - mean) ** 2, 0) / Math.max(rets.length, 1);
  return Math.sqrt(variance) * Math.sqrt(252);
}

function safeBars(symbol: string): PriceBar[] {
  try {
    return getSamplePriceHistory(symbol);
  } catch {
    return [];
  }
}

function categoryReturn(category: StockFundamentals['category']): number {
  const stocks = SAMPLE_STOCKS.filter((s) => s.category === category);
  if (stocks.length === 0) return 0;
  const returns = stocks.map((s) => returnPct(safeBars(s.symbol)));
  return returns.reduce((a, b) => a + b, 0) / returns.length;
}

function breadthAboveMa50(): number {
  let above = 0;
  let total = 0;
  for (const stock of SAMPLE_STOCKS) {
    const bars = safeBars(stock.symbol);
    if (bars.length < 20) continue;
    const tech = analyzeTechnicals(bars);
    total += 1;
    if (stock.price >= tech.ma50) above += 1;
  }
  return total > 0 ? (above / total) * 100 : 50;
}

function avgUsVolatility(): number {
  const us = SAMPLE_STOCKS.filter((s) => s.market === 'us');
  const vols = us.map((s) => volatilityPct(safeBars(s.symbol)));
  return vols.length ? vols.reduce((a, b) => a + b, 0) / vols.length : 18;
}

/** 利用可能なサンプルデータからマクロ代理指標を算出 */
export function buildMarketIndicatorsSnapshot(): MarketIndicatorsSnapshot {
  const usMom = returnPct(safeBars(PROXY.usBreadth));
  const bursaMom = returnPct(safeBars(PROXY.bursaIndex));
  const indexMomentumPct = usMom * 0.6 + bursaMom * 0.4;

  const defensive = returnPct(safeBars(PROXY.usDefensive));
  const growth = returnPct(safeBars(PROXY.usGrowth));
  const defensiveVsGrowthSpread = defensive - growth;

  const oilTrendPct = returnPct(safeBars(PROXY.oilEnergy));
  const vol = avgUsVolatility();

  const usRet =
    (returnPct(safeBars(PROXY.usBreadth)) + returnPct(safeBars(PROXY.usGrowth))) / 2;
  const emRet =
    (returnPct(safeBars(PROXY.bursaIndex)) + returnPct(safeBars(PROXY.hkProxy))) / 2;
  const usdStrengthProxy = Math.max(-1, Math.min(1, (usRet - emRet) / 20));

  const financial =
    (returnPct(safeBars(PROXY.usFinancial)) + returnPct(safeBars('1155'))) / 2;
  const ratePressureProxy = Math.max(0, Math.min(100, 50 + (financial - growth) * 2));

  const volumes = SAMPLE_STOCKS.map((s) => s.volume);
  const avgVol = volumes.reduce((a, b) => a + b, 0) / Math.max(volumes.length, 1);
  const liquidCount = SAMPLE_STOCKS.filter((s) => s.volume >= avgVol * 0.8).length;
  const liquidityProxy = Math.max(
    0,
    Math.min(100, (liquidCount / Math.max(SAMPLE_STOCKS.length, 1)) * 50 + Math.max(0, usMom) * 2),
  );

  const schdBars = safeBars(PROXY.usBreadth);
  const maTrendScore =
    schdBars.length >= 20
      ? analyzeTechnicals(schdBars).ma20 >= analyzeTechnicals(schdBars).ma50
        ? 65
        : 35
      : 50;

  return {
    indexMomentumPct: Math.round(indexMomentumPct * 10) / 10,
    volatilityProxyPct: Math.round(vol * 10) / 10,
    oilTrendPct: Math.round(oilTrendPct * 10) / 10,
    usdStrengthProxy: Math.round(usdStrengthProxy * 100) / 100,
    breadthPctAboveMa50: Math.round(breadthAboveMa50()),
    defensiveVsGrowthSpread: Math.round(defensiveVsGrowthSpread * 10) / 10,
    ratePressureProxy: Math.round(ratePressureProxy),
    liquidityProxy: Math.round(liquidityProxy),
    sectorRotationScore: Math.round(
      (categoryReturn('growth') - categoryReturn('dividend') + categoryReturn('etf') * 0.3) * 10,
    ) / 10,
    maTrendScore,
    computedAt: new Date().toISOString(),
  };
}

export function stockToSectorTheme(stock: StockFundamentals): SectorTheme {
  const sym = stock.symbol.toUpperCase();
  if (stock.category === 'etf') return 'etf';
  if (sym === '5183') return 'energy';
  if (sym === '1155' || sym === '1023' || sym === '5225' || sym === 'BAC') return 'financial';
  if (sym === '5347') return 'utilities';
  if (sym === '4707' || sym === 'KO') return 'consumer';
  if (sym === 'PFE' || sym === '0700') return 'healthcare';
  if (sym === 'INTC' || sym === '7103') return 'technology';
  if (sym === 'F') return 'industrial';
  if (stock.category === 'dividend') return 'dividend';
  if (stock.category === 'growth') return 'growth';
  return stock.category === 'stable' ? 'consumer' : 'growth';
}
