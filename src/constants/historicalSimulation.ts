import type { MarketRegimeId } from '../types/marketRegime';
import { MARKET_REGIME_LABEL } from './marketRegime';

export const TRADING_DAYS_HISTORY = 504;
export const WALK_FORWARD_TRAIN_DAYS = 63;
export const WALK_FORWARD_TEST_DAYS = 21;
export const WALK_FORWARD_STEP_DAYS = 21;
export const REBALANCE_INTERVAL_DAYS = 21;
export const RISK_FREE_RATE_ANNUAL = 0.03;
export const MAX_HOLDINGS = 8;

export const BACKTEST_SLIPPAGE_BPS = 8;
export const BACKTEST_TURNOVER_COST_BPS = 12;

export const STRESS_SCENARIOS: {
  id: string;
  labelJa: string;
  startDayIdx: number;
  endDayIdx: number;
  dailyShockScale: number;
}[] = [
  {
    id: 'covid_crash',
    labelJa: 'COVID暴落 (2020相当)',
    startDayIdx: 95,
    endDayIdx: 125,
    dailyShockScale: 1.85,
  },
  {
    id: 'inflation_bear_2022',
    labelJa: '2022インフレ・ベア',
    startDayIdx: 210,
    endDayIdx: 290,
    dailyShockScale: 1.35,
  },
  {
    id: 'banking_crisis_2023',
    labelJa: '銀行危機 (2023相当)',
    startDayIdx: 335,
    endDayIdx: 355,
    dailyShockScale: 1.55,
  },
];

export const REGIME_LABEL: Record<MarketRegimeId, string> = MARKET_REGIME_LABEL;
