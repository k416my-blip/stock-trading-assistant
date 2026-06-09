import {
  ALERT_TITLE,
  DEFAULT_NOTIFICATION_SETTINGS,
  MARKET_ALERT_LEAD_MS,
  NOTIFICATION_COOLDOWN_MS,
  NOTIFICATION_HISTORY_MAX,
  PRICE_ALERT_PROXIMITY_PCT,
} from '../constants/notifications';
import {
  canSendGlobalNotification,
  recordGlobalNotificationSent,
  shouldPauseApiRequests,
} from './performanceCostRuntime';
import type {
  AlertType,
  AllocationPlan,
  AppState,
  Market,
  NotificationCooldownMap,
  NotificationHistoryItem,
  NotificationSettings,
  PortfolioPosition,
} from '../types';
import { getMarketSession } from './marketSession';
import { buildHoldingDetails, calculatePositionsPnLFromList } from './portfolio';
import {
  buildAllowedSymbolKeySet,
  normalizeSymbolKey,
  resolveSymbolsForNotifications,
} from './userAnalysisSymbols';

export interface AlertPayload {
  type: AlertType;
  cooldownKey: string;
  title: string;
  body: string;
  symbol?: string;
  market?: Market;
}

export function isAlertTypeEnabled(settings: NotificationSettings, type: AlertType): boolean {
  switch (type) {
    case 'allocation_plan':
    case 'buy_candidate':
      return settings.notifyBuyCandidate;
    case 'sell_candidate':
      return settings.notifySellCandidate;
    case 'stop_loss_near':
      return settings.notifyStopLoss;
    case 'take_profit_near':
      return settings.notifyTakeProfit;
    case 'market_open_bursa':
    case 'market_open_us':
    case 'market_open_hk':
      return settings.notifyMarketOpenBefore;
    case 'market_close_bursa':
    case 'market_close_us':
    case 'market_close_hk':
      return settings.notifyMarketCloseBefore;
    default:
      return false;
  }
}

export function canSendAlert(
  cooldowns: NotificationCooldownMap,
  cooldownKey: string,
  now = Date.now(),
): boolean {
  const last = cooldowns[cooldownKey];
  if (last == null) return true;
  return now - last >= NOTIFICATION_COOLDOWN_MS;
}

export function applyCooldown(
  cooldowns: NotificationCooldownMap,
  cooldownKey: string,
  now = Date.now(),
): NotificationCooldownMap {
  return { ...cooldowns, [cooldownKey]: now };
}

export function appendNotificationHistory(
  history: NotificationHistoryItem[],
  entry: Omit<NotificationHistoryItem, 'id'>,
): NotificationHistoryItem[] {
  const item: NotificationHistoryItem = { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
  return [item, ...history].slice(0, NOTIFICATION_HISTORY_MAX);
}

export function prepareAlertDispatch(
  state: AppState,
  payload: AlertPayload,
  now = Date.now(),
): { nextState: AppState; shouldSend: boolean } {
  const settings = state.notificationSettings ?? DEFAULT_NOTIFICATION_SETTINGS;
  if (!isAlertTypeEnabled(settings, payload.type)) {
    return { nextState: state, shouldSend: false };
  }
  if (!canSendAlert(state.notificationCooldowns ?? {}, payload.cooldownKey, now)) {
    return { nextState: state, shouldSend: false };
  }
  if (shouldPauseApiRequests() && payload.type !== 'allocation_plan') {
    return { nextState: state, shouldSend: false };
  }
  if (!canSendGlobalNotification(now)) {
    return { nextState: state, shouldSend: false };
  }

  const nextState: AppState = {
    ...state,
    notificationCooldowns: applyCooldown(state.notificationCooldowns ?? {}, payload.cooldownKey, now),
    notificationHistory: appendNotificationHistory(state.notificationHistory ?? [], {
      alertType: payload.type,
      title: payload.title,
      body: payload.body,
      symbol: payload.symbol,
      market: payload.market,
      sentAt: new Date(now).toISOString(),
    }),
  };

  recordGlobalNotificationSent(now);
  return { nextState, shouldSend: true };
}

function cooldownKey(type: AlertType, symbol?: string, market?: Market): string {
  if (symbol) return `${type}:${symbol}`;
  if (market) return `${type}:${market}`;
  return type;
}

export function buildAllocationPlanAlert(plan: AllocationPlan): AlertPayload {
  const symbols = plan.candidates.map((c) => c.symbol).join('、');
  return {
    type: 'allocation_plan',
    cooldownKey: cooldownKey('allocation_plan', undefined, plan.market),
    title: ALERT_TITLE.allocation_plan,
    body: symbols
      ? `${plan.market.toUpperCase()}向け ${plan.candidates.length}銘柄: ${symbols}。Rakuten Tradeで内容をご確認ください。`
      : '新しい配分案を確認してください。',
    market: plan.market,
  };
}

export function buildBuySignalAlert(symbol: string, market: Market, name: string): AlertPayload {
  return {
    type: 'buy_candidate',
    cooldownKey: cooldownKey('buy_candidate', symbol),
    title: ALERT_TITLE.buy_candidate,
    body: `${symbol}（${name}）— 買いシグナルが出ています。注文はご自身で判断してください。`,
    symbol,
    market,
  };
}

export function buildSellSignalAlert(symbol: string, market: Market, name: string): AlertPayload {
  return {
    type: 'sell_candidate',
    cooldownKey: cooldownKey('sell_candidate', symbol),
    title: ALERT_TITLE.sell_candidate,
    body: `${symbol}（${name}）— 売りシグナルが出ています。注文はご自身で判断してください。`,
    symbol,
    market,
  };
}

export function buildStopLossAlert(symbol: string, market: Market, name: string, price: number): AlertPayload {
  return {
    type: 'stop_loss_near',
    cooldownKey: cooldownKey('stop_loss_near', symbol),
    title: ALERT_TITLE.stop_loss_near,
    body: `${symbol}（${name}）の株価 ${price.toFixed(2)} が損切り推奨付近です。`,
    symbol,
    market,
  };
}

export function buildTakeProfitAlert(symbol: string, market: Market, name: string, price: number): AlertPayload {
  return {
    type: 'take_profit_near',
    cooldownKey: cooldownKey('take_profit_near', symbol),
    title: ALERT_TITLE.take_profit_near,
    body: `${symbol}（${name}）の株価 ${price.toFixed(2)} が利確推奨付近です。`,
    symbol,
    market,
  };
}

function isNearStopLoss(current: number, stopLoss: number): boolean {
  if (stopLoss <= 0 || current <= 0) return false;
  if (current <= stopLoss) return true;
  const gapPct = ((current - stopLoss) / current) * 100;
  return gapPct <= PRICE_ALERT_PROXIMITY_PCT;
}

function isNearTakeProfit(current: number, takeProfit: number): boolean {
  if (takeProfit <= 0 || current <= 0) return false;
  if (current >= takeProfit) return true;
  const gapPct = ((takeProfit - current) / current) * 100;
  return gapPct <= PRICE_ALERT_PROXIMITY_PCT;
}

export function scanHoldingAlerts(positions: PortfolioPosition[]): AlertPayload[] {
  if (positions.length === 0) return [];
  const pnls = calculatePositionsPnLFromList(positions);
  const total = pnls.reduce((s, p) => s + p.currentValue, 0);
  const holdings = buildHoldingDetails(positions, total);
  const alerts: AlertPayload[] = [];

  for (const h of holdings) {
    if (isNearStopLoss(h.currentPrice, h.stopLossUnitPrice)) {
      alerts.push(buildStopLossAlert(h.symbol, h.market, h.name, h.currentPrice));
    }
    if (isNearTakeProfit(h.currentPrice, h.takeProfitUnitPrice)) {
      alerts.push(buildTakeProfitAlert(h.symbol, h.market, h.name, h.currentPrice));
    }
  }
  return alerts;
}

const MARKET_OPEN_TYPES: Record<Market, AlertType> = {
  bursa: 'market_open_bursa',
  us: 'market_open_us',
  hk: 'market_open_hk',
};

const MARKET_CLOSE_TYPES: Record<Market, AlertType> = {
  bursa: 'market_close_bursa',
  us: 'market_close_us',
  hk: 'market_close_hk',
};

export function scanMarketSessionAlerts(at = new Date()): AlertPayload[] {
  const alerts: AlertPayload[] = [];
  const markets: Market[] = ['bursa', 'us', 'hk'];

  for (const market of markets) {
    const session = getMarketSession(market, at);
    if (session.msUntilNextEvent > MARKET_ALERT_LEAD_MS) continue;

    if (session.countdownTarget === 'open') {
      const type = MARKET_OPEN_TYPES[market];
      alerts.push({
        type,
        cooldownKey: cooldownKey(type, undefined, market),
        title: ALERT_TITLE[type],
        body: session.message,
        market,
      });
    } else {
      const type = MARKET_CLOSE_TYPES[market];
      alerts.push({
        type,
        cooldownKey: cooldownKey(type, undefined, market),
        title: ALERT_TITLE[type],
        body: session.message,
        market,
      });
    }
  }

  return alerts;
}

export function collectPeriodicAlerts(state: AppState, at = new Date()): AlertPayload[] {
  const isPractice = state.appMode === 'practice';
  const allowed = buildAllowedSymbolKeySet(
    resolveSymbolsForNotifications(state, isPractice),
  );
  const positions = (isPractice ? state.practice.portfolio : state.portfolio).filter((p) =>
    allowed.has(normalizeSymbolKey(p.symbol)),
  );
  return [...scanHoldingAlerts(positions), ...scanMarketSessionAlerts(at)];
}
