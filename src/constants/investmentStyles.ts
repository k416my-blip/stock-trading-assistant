import type { InvestmentStyle, RiskLevel } from '../types';

export type VolatilityLevel = 'small' | 'medium' | 'large' | 'very_large';

/** 初心者向け運用スタイル（リスク＋投資スタイルを一体） */
export interface InvestmentStyleProfile {
  style: InvestmentStyle;
  /** 配分プラン用の内部リスク */
  riskLevel: RiskLevel;
  title: string;
  riskLabel: string;
  riskFilled: number;
  periodLabel: string;
  periodFilled: number;
  volatilityLabel: string;
  volatilityLevel: VolatilityLevel;
  allocationTendency: string;
  beginnerStars: number;
  description: string;
  showBeginnerBadge?: boolean;
  cardWarning?: string;
}

const METER_TOTAL = 10;

export const INVESTMENT_STYLE_PROFILES: InvestmentStyleProfile[] = [
  {
    style: 'dividend',
    riskLevel: 'low',
    title: '安全運用',
    riskLabel: 'リスク低',
    riskFilled: 3,
    periodLabel: '長期向け',
    periodFilled: 9,
    volatilityLabel: '小',
    volatilityLevel: 'small',
    allocationTendency: '配当・大型株中心',
    beginnerStars: 5,
    description: '大きな損失を避けながら、ゆっくり増やしたい方向け',
    showBeginnerBadge: true,
  },
  {
    style: 'balanced',
    riskLevel: 'standard',
    title: '標準運用',
    riskLabel: 'リスク中',
    riskFilled: 5,
    periodLabel: '中長期向け',
    periodFilled: 7,
    volatilityLabel: '普通',
    volatilityLevel: 'medium',
    allocationTendency: 'バランス型',
    beginnerStars: 4,
    description: '安定と成長のバランスを取りたい方向け',
    showBeginnerBadge: true,
  },
  {
    style: 'growth',
    riskLevel: 'standard',
    title: '成長重視',
    riskLabel: 'リスクやや高',
    riskFilled: 7,
    periodLabel: '中期向け',
    periodFilled: 5,
    volatilityLabel: '大',
    volatilityLevel: 'large',
    allocationTendency: '成長株中心',
    beginnerStars: 3,
    description: '値上がりを狙いたい方向け',
  },
  {
    style: 'short_term',
    riskLevel: 'high',
    title: '短期勝負',
    riskLabel: 'リスク高',
    riskFilled: 10,
    periodLabel: '短期向け',
    periodFilled: 2,
    volatilityLabel: '大',
    volatilityLevel: 'very_large',
    allocationTendency: '短期売買練習',
    beginnerStars: 1,
    description: '短期間で利益を狙う練習向け（上級者向け）',
    cardWarning: '初心者には難しい場合があります',
  },
];

export function getStyleProfile(style: InvestmentStyle): InvestmentStyleProfile {
  return INVESTMENT_STYLE_PROFILES.find((p) => p.style === style) ?? INVESTMENT_STYLE_PROFILES[1];
}

export function getPlanRiskLevel(style: InvestmentStyle): RiskLevel {
  return getStyleProfile(style).riskLevel;
}

export const STYLE_METER_TOTAL = METER_TOTAL;

export const INVESTMENT_STYLE_SECTION_TITLE = 'あなたに合う運用スタイル';

export const INVESTMENT_STYLE_WARNINGS = [
  'リスクが高いほど損失も大きくなる可能性があります',
  '短期勝負は初心者には難しい場合があります',
] as const;
