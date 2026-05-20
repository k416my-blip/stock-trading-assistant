import { useEffect, useState } from 'react';
import { getAllMarketSessions, getMarketSession, type MarketSessionInfo } from '../services/marketSession';
import type { Market } from '../types';

const TICK_MS = 30_000;

export function useMarketSession(market: Market): MarketSessionInfo {
  const [info, setInfo] = useState(() => getMarketSession(market));

  useEffect(() => {
    const refresh = () => setInfo(getMarketSession(market));
    refresh();
    const id = setInterval(refresh, TICK_MS);
    return () => clearInterval(id);
  }, [market]);

  return info;
}

export function useAllMarketSessions(): MarketSessionInfo[] {
  const [sessions, setSessions] = useState(() => getAllMarketSessions());

  useEffect(() => {
    const refresh = () => setSessions(getAllMarketSessions());
    refresh();
    const id = setInterval(refresh, TICK_MS);
    return () => clearInterval(id);
  }, []);

  return sessions;
}
