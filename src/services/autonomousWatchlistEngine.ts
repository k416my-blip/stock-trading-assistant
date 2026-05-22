import { AUTONOMOUS_HIGH_VOL_CHANGE_PCT, AUTONOMOUS_MAX_WATCHLIST } from '../constants/autonomousMonitoring';
import type { ConciergeSymbolEvidence } from '../types/conciergeEvidence';
import type { Market } from '../types/index';
import type { AutonomousWatchlistEntry, WatchlistPriorityTier } from '../types/autonomousMonitoring';

const TIER_RANK: Record<WatchlistPriorityTier, number> = {
  portfolio_holding: 0,
  unusual_activity: 1,
  high_volatility: 2,
  recent_viewed: 3,
  market_leader: 4,
};

type BuildWatchlistInput = {
  holdings: Array<{ symbol: string; market: Market; shares: number }>;
  evidenceSymbols: ConciergeSymbolEvidence[];
  recentViewedSymbols: string[];
  marketLeaderSymbols: string[];
};

function upsert(
  map: Map<string, AutonomousWatchlistEntry>,
  entry: Omit<AutonomousWatchlistEntry, 'tierRank' | 'monitoringScore'> & {
    tier: WatchlistPriorityTier;
  },
): void {
  const key = entry.symbol.toUpperCase();
  const existing = map.get(key);
  const tierRank = TIER_RANK[entry.tier];
  if (!existing || tierRank < existing.tierRank) {
    map.set(key, {
      ...entry,
      tierRank,
      monitoringScore: scoreEntry(entry),
    });
  }
}

function scoreEntry(e: {
  tier: WatchlistPriorityTier;
  intradayChangePct: number | null;
  volumeSurgeRatio: number | null;
}): number {
  let s = 50 - TIER_RANK[e.tier] * 8;
  if (e.intradayChangePct != null) s += Math.min(25, Math.abs(e.intradayChangePct) * 4);
  if (e.volumeSurgeRatio != null) s += Math.min(20, e.volumeSurgeRatio * 5);
  return Math.round(Math.min(100, s));
}

export function buildAutonomousWatchlist(input: BuildWatchlistInput): AutonomousWatchlistEntry[] {
  const map = new Map<string, AutonomousWatchlistEntry>();
  const evidenceBySym = new Map(
    input.evidenceSymbols.map((s) => [s.symbol.toUpperCase(), s] as const),
  );

  for (const h of input.holdings.filter((p) => p.shares > 0)) {
    const ev = evidenceBySym.get(h.symbol.toUpperCase());
    upsert(map, {
      symbol: h.symbol,
      market: h.market,
      displayLabelJa: ev?.displayLabelJa ?? h.symbol,
      tier: 'portfolio_holding',
      intradayChangePct: ev?.intradayChangePct ?? null,
      volumeSurgeRatio: ev?.volumeSurgeRatio ?? null,
    });
  }

  for (const sym of input.evidenceSymbols) {
    if (sym.unusualActivityFlags.length > 0) {
      upsert(map, {
        symbol: sym.symbol,
        market: sym.market,
        displayLabelJa: sym.displayLabelJa,
        tier: 'unusual_activity',
        intradayChangePct: sym.intradayChangePct,
        volumeSurgeRatio: sym.volumeSurgeRatio,
      });
    } else if (
      sym.intradayChangePct != null &&
      Math.abs(sym.intradayChangePct) >= AUTONOMOUS_HIGH_VOL_CHANGE_PCT
    ) {
      upsert(map, {
        symbol: sym.symbol,
        market: sym.market,
        displayLabelJa: sym.displayLabelJa,
        tier: 'high_volatility',
        intradayChangePct: sym.intradayChangePct,
        volumeSurgeRatio: sym.volumeSurgeRatio,
      });
    }
  }

  for (const sym of input.recentViewedSymbols) {
    const ev = evidenceBySym.get(sym.toUpperCase());
    if (!ev) continue;
    upsert(map, {
      symbol: ev.symbol,
      market: ev.market,
      displayLabelJa: ev.displayLabelJa,
      tier: 'recent_viewed',
      intradayChangePct: ev.intradayChangePct,
      volumeSurgeRatio: ev.volumeSurgeRatio,
    });
  }

  for (const sym of input.marketLeaderSymbols.slice(0, 4)) {
    const ev = evidenceBySym.get(sym.toUpperCase());
    if (!ev) continue;
    upsert(map, {
      symbol: ev.symbol,
      market: ev.market,
      displayLabelJa: ev.displayLabelJa,
      tier: 'market_leader',
      intradayChangePct: ev.intradayChangePct,
      volumeSurgeRatio: ev.volumeSurgeRatio,
    });
  }

  return [...map.values()]
    .sort((a, b) => a.tierRank - b.tierRank || b.monitoringScore - a.monitoringScore)
    .slice(0, AUTONOMOUS_MAX_WATCHLIST);
}
