import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { countActiveHoldings } from '../utils/portfolioHoldings';
import { hasCorruptPortfolioPrice, isPortfolioStructurallyCorrupt } from '../utils/portfolioIntegrity';
import type { AppState, PortfolioPosition } from '../types';
import { isValidQuotePrice, safePrice, safeShares } from '../utils/safeNumeric';

export type HealthyPortfolioSnapshot = {
  version: 2;
  savedAt: string;
  manualChecksum: string;
  practiceChecksum: string;
  portfolio: PortfolioPosition[];
  practicePortfolio: PortfolioPosition[];
};

export { isPortfolioStructurallyCorrupt };

function djb2Hash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function canonicalPortfolio(portfolio: PortfolioPosition[]): string {
  return JSON.stringify(
    portfolio
      .filter((p) => safeShares(p.shares, 0) > 0)
      .map((p) => ({
        id: p.id,
        symbol: p.symbol,
        market: p.market,
        shares: safeShares(p.shares, 0),
        averageBuyPrice: safePrice(p.averageBuyPrice, 0, 0),
        currentPrice: safePrice(p.currentPrice, p.averageBuyPrice, 0),
        currency: p.currency,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
  );
}

export function computePortfolioChecksum(portfolio: PortfolioPosition[]): string {
  return djb2Hash(canonicalPortfolio(portfolio));
}

export function isHealthyPortfolio(portfolio: PortfolioPosition[]): boolean {
  const active = portfolio.filter((p) => safeShares(p.shares, 0) > 0);
  if (active.length === 0) return false;
  return active.every((p) => {
    const shares = safeShares(p.shares, 0);
    const avg = safePrice(p.averageBuyPrice, 0, 0);
    if (hasCorruptPortfolioPrice(p.currentPrice)) return false;
    const price = safePrice(p.currentPrice, avg, 0);
    return shares > 0 && avg > 0 && (price <= 0 || isValidQuotePrice(price));
  });
}

export function verifyPortfolioChecksum(
  portfolio: PortfolioPosition[],
  checksum: string,
): boolean {
  if (!checksum) return false;
  return computePortfolioChecksum(portfolio) === checksum;
}

export function isMalformedPortfolioSync(
  baseline: PortfolioPosition[],
  incoming: PortfolioPosition[],
): boolean {
  const baseActive = countActiveHoldings(baseline);
  const incActive = countActiveHoldings(incoming);
  if (baseActive > 0 && incActive === 0) return true;

  for (const before of baseline) {
    if (safeShares(before.shares, 0) <= 0) continue;
    const after = incoming.find((p) => p.id === before.id);
    if (!after) return true;
    if (safeShares(after.shares, 0) <= 0) return true;
    if (hasCorruptPortfolioPrice(after.currentPrice)) return true;
    const price = safePrice(after.currentPrice, after.averageBuyPrice, 0);
    if (price > 0 && !isValidQuotePrice(price)) return true;
  }
  return false;
}

export async function saveHealthyPortfolioLists(
  manual: PortfolioPosition[],
  practice: PortfolioPosition[] = [],
): Promise<void> {
  const manualOk = isHealthyPortfolio(manual);
  const practiceOk = isHealthyPortfolio(practice);
  if (!manualOk && !practiceOk) return;

  const payload: HealthyPortfolioSnapshot = {
    version: 2,
    savedAt: new Date().toISOString(),
    manualChecksum: manualOk ? computePortfolioChecksum(manual) : '',
    practiceChecksum: practiceOk ? computePortfolioChecksum(practice) : '',
    portfolio: manualOk ? manual : [],
    practicePortfolio: practiceOk ? practice : [],
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.portfolioHealthySnapshot, JSON.stringify(payload));
  } catch {
    /* 検証スクリプト等でストレージ未利用時 */
  }
}

export async function saveHealthyPortfolioSnapshot(state: AppState): Promise<void> {
  const manualOk = isHealthyPortfolio(state.portfolio);
  const practiceOk = isHealthyPortfolio(state.practice.portfolio);
  if (!manualOk && !practiceOk) return;

  const payload: HealthyPortfolioSnapshot = {
    version: 2,
    savedAt: new Date().toISOString(),
    manualChecksum: manualOk ? computePortfolioChecksum(state.portfolio) : '',
    practiceChecksum: practiceOk ? computePortfolioChecksum(state.practice.portfolio) : '',
    portfolio: manualOk ? state.portfolio : [],
    practicePortfolio: practiceOk ? state.practice.portfolio : [],
  };

  try {
    await AsyncStorage.setItem(STORAGE_KEYS.portfolioHealthySnapshot, JSON.stringify(payload));
  } catch {
    /* storage unavailable */
  }
}

export async function loadHealthyPortfolioSnapshot(): Promise<HealthyPortfolioSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.portfolioHealthySnapshot);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as HealthyPortfolioSnapshot;
    if (parsed.version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

function shouldRestoreManualPortfolio(
  current: PortfolioPosition[],
  snapshot: PortfolioPosition[],
  checksum: string,
): boolean {
  if (countActiveHoldings(snapshot) === 0) return false;
  if (!verifyPortfolioChecksum(snapshot, checksum)) return false;
  if (countActiveHoldings(current) === 0) return true;
  return isPortfolioStructurallyCorrupt(current);
}

function shouldRestorePracticePortfolio(
  current: PortfolioPosition[],
  snapshot: PortfolioPosition[],
  checksum: string,
): boolean {
  return shouldRestoreManualPortfolio(current, snapshot, checksum);
}

export async function recoverPortfolioFromHealthySnapshot(
  state: AppState,
): Promise<AppState> {
  const snap = await loadHealthyPortfolioSnapshot();
  if (!snap) return state;

  let next = state;

  if (shouldRestoreManualPortfolio(state.portfolio, snap.portfolio, snap.manualChecksum)) {
    next = { ...next, portfolio: snap.portfolio };
  }

  if (
    shouldRestorePracticePortfolio(
      state.practice.portfolio,
      snap.practicePortfolio,
      snap.practiceChecksum,
    )
  ) {
    next = {
      ...next,
      practice: { ...next.practice, portfolio: snap.practicePortfolio },
    };
  }

  return next;
}

export function rollbackPortfolioSync(
  baseline: PortfolioPosition[],
  incoming: PortfolioPosition[],
): PortfolioPosition[] {
  if (isMalformedPortfolioSync(baseline, incoming)) {
    return baseline;
  }
  return incoming;
}
