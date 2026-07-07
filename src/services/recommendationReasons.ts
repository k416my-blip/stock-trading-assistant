import { STOCK_CATEGORY_LABEL } from '../constants/stockCatalog';
import type { InvestmentStyle, RiskLevel, StockFundamentals } from '../types';
import { isBeginnerFriendly, isMegaCap, oneShareMYR } from './stockCatalog';

export function buildSelectionReason(
  stock: StockFundamentals,
  style: InvestmentStyle,
  risk: RiskLevel,
  budgetPerSlotMYR: number,
): string {
  const parts: string[] = [];
  const typeLabel = STOCK_CATEGORY_LABEL[stock.category];

  parts.push(`【${typeLabel}】このタイプをプランに混ぜて分散しています`);

  switch (stock.category) {
    case 'etf':
      parts.push('1本で多くの銘柄に分けられるため、初心者の分散投資向き');
      break;
    case 'stable':
      parts.push('業種・規模が比較的安定し、値動きのイメージが穏やかめ');
      break;
    case 'dividend':
      parts.push(`配当利回り${stock.dividendYield.toFixed(1)}% — 配当収入のイメージで選定`);
      break;
    case 'growth':
      parts.push('売上・利益の伸びが期待される成長株の枠');
      break;
  }

  if (stock.beginnerFriendly || isBeginnerFriendly(stock, budgetPerSlotMYR)) {
    parts.push(`1株あたり約RM${oneShareMYR(stock).toLocaleString('ja-JP')}で、少額から検討しやすい価格帯`);
  }

  if (isMegaCap(stock)) {
    parts.push('メガキャップはプラン内1銘柄までに制限（集中回避）');
  } else if (stock.marketCap >= 10_000_000_000) {
    parts.push('時価総額が中〜大型で流動性が取りやすい');
  }

  if (risk === 'low') parts.push('低リスク設定のため、安定・配当・ETFを優先');
  if (style === 'dividend' && stock.category === 'dividend') parts.push('配当重視スタイルに合わせた選定');
  if (style === 'growth' && stock.category === 'growth') parts.push('成長重視スタイルに合わせた選定');
  if (style === 'balanced') parts.push('バランス型のため、ETF・配当・成長を組み合わせ');

  return parts.join('。');
}

export function buildBeginnerNote(stock: StockFundamentals, style: InvestmentStyle): string {
  if (stock.category === 'etf') {
    return `${stock.name}はETFです。1つ買うだけでたくさんの会社に小分け投資したイメージです。`;
  }
  if (stock.category === 'dividend') {
    return `${stock.name}は配当のイメージです。配当は変わることがあるので、Rakuten Tradeで最新情報を確認してください。`;
  }
  if (stock.category === 'growth') {
    return `${stock.name}は成長枠の候補です。値上がりを期待する一方、下がることもあります。損切りラインを決めておきましょう。`;
  }
  if (style === 'short_term') {
    return `短期の練習向けです。すぐ売る前提なら、小さな金額から試すのがおすすめです。`;
  }
  return `${stock.name}は安定寄りの候補です。他の購入候補と組み合わせると分散になります。`;
}

export type BeginnerRecommendationQuality = {
  whySelected: string;
  beginnerBenefit: string;
  mainRisk: string;
  expectedReturnView: string;
  whenToReview: string;
  whenNotToBuy: string;
};

/** Structured beginner-facing rationale (no guaranteed-return language). */
export function buildBeginnerRecommendationQuality(candidate: {
  symbol: string;
  name: string;
  category: string;
  selectionReason: string;
  beginnerNote: string;
  dividendYield?: number;
}): BeginnerRecommendationQuality {
  const whySelected = candidate.selectionReason || `${candidate.name}（${candidate.symbol}）を分散枠として選定`;
  const beginnerBenefit =
    candidate.beginnerNote ||
    '複数銘柄に分けることで、1社だけに依存しない参考プランになります。';
  const mainRisk =
    candidate.category === 'growth'
      ? '成長株は値下がりリスクがあり、元本割れの可能性があります。'
      : candidate.category === 'etf'
        ? 'ETFも市場全体の下落時には値下がりします。'
        : '個別株は業績・金利・為替などで価格が変動します。';
  const expectedReturnView =
    candidate.dividendYield && candidate.dividendYield > 0
      ? `配当利回り${candidate.dividendYield.toFixed(1)}%前後を参考に、長期の配当・値上がりを見込む考え方（保証ではありません）。`
      : '短期の値上がりを狙うのではなく、中長期の分散保有を想定した候補です（結果を約束するものではありません）。';
  const whenToReview = '四半期決算、配当発表、大きな値動きがあったとき、または入金額・目的が変わったとき';
  const whenNotToBuy =
    '急ぎの短期利益が目的のとき、同業種に既に偏っているとき、価格・数量をRakuten Tradeで確認できないとき';
  return {
    whySelected,
    beginnerBenefit,
    mainRisk,
    expectedReturnView,
    whenToReview,
    whenNotToBuy,
  };
}
