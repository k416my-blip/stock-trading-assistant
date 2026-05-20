import { getExtendedFundamentals } from '../../data/sampleExtendedFundamentals';
import type { StockFundamentals } from '../../types';
import type { FundamentalAnalysisResult } from '../../types/recommendation';
import { isMegaCap } from '../stockCatalog';

function clampScore(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

function scoreMetric(value: number, goodLow: number, goodHigh: number, invert = false): number {
  if (!Number.isFinite(value)) return 50;
  const mid = (goodLow + goodHigh) / 2;
  const span = (goodHigh - goodLow) / 2 || 1;
  const dist = invert ? (value - mid) / span : (mid - value) / span;
  return clampScore(70 - dist * 25);
}

export function analyzeFundamentals(stock: StockFundamentals): FundamentalAnalysisResult {
  const ext = getExtendedFundamentals(stock.symbol);
  const per = stock.per > 0 ? stock.per : null;
  const pbr = ext.pbr;
  const dividendYield = stock.dividendYield;
  const roe = ext.roe;
  const revenueGrowthPct = ext.revenueGrowthPct;
  const profitGrowthPct = ext.profitGrowthPct;
  const debtRatioPct = ext.debtRatioPct;
  const marketCap = stock.marketCap;

  const parts: number[] = [];
  if (per != null) parts.push(scoreMetric(per, 8, 22, true));
  parts.push(scoreMetric(pbr, 0.8, 3.5, true));
  if (dividendYield > 0) parts.push(clampScore(50 + dividendYield * 4));
  parts.push(scoreMetric(roe, 8, 22));
  parts.push(scoreMetric(revenueGrowthPct, 0, 18));
  parts.push(scoreMetric(profitGrowthPct, 0, 20));
  parts.push(scoreMetric(debtRatioPct, 20, 55, true));
  if (stock.category === 'etf') parts.push(72);
  if (isMegaCap(stock)) parts.push(58);
  if (stock.volume >= 5_000_000) parts.push(68);

  const score = clampScore(parts.reduce((a, b) => a + b, 0) / Math.max(parts.length, 1));

  const termNotes: Record<string, string> = {
    PER: '株価が利益の何倍か（安い・高いの目安）',
    PBR: '株価が純資産の何倍か',
    配当利回り: '株価に対する配当の割合',
    ROE: '自己資本でどれだけ利益を出しているか',
    売上成長率: '売上が前年より増えているか',
    利益成長率: '利益が前年より増えているか',
    負債比率: '借金の多さの目安（低いほど安心とされることが多い）',
    時価総額: '会社全体の市場での価値',
  };

  const summaryParts: string[] = [];
  if (per != null) summaryParts.push(`PER ${per.toFixed(1)}`);
  summaryParts.push(`PBR ${pbr.toFixed(1)}`, `配当 ${formatYield(dividendYield)}`, `ROE ${roe.toFixed(1)}%`);

  return {
    score,
    per,
    pbr,
    dividendYield,
    roe,
    revenueGrowthPct,
    profitGrowthPct,
    debtRatioPct,
    marketCap,
    termNotes,
    summary: summaryParts.join(' · '),
    explanation:
      'ファンダメンタル分析：会社の業績・財務・バリュエーションを数字で見る目安です。良い／悪いの断定ではありません。',
    source: 'estimated',
  };
}

function formatYield(v: number): string {
  return `${v.toFixed(1)}%`;
}
