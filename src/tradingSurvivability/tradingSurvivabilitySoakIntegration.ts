import type { TradingSurvivabilityTimelineEntry } from '../types/tradingSurvivabilityOrchestration';
import { recordSoakTimeline } from '../native/soak/sessionTimelineRecorder';

let soakHookEnabled = false;

export function resetTradingSurvivabilitySoakIntegrationForTest(): void {
  soakHookEnabled = false;
}

export function setTradingSurvivabilitySoakHook(enabled: boolean): void {
  soakHookEnabled = enabled;
}

export function recordTradingSurvivabilitySoakEvent(entry: TradingSurvivabilityTimelineEntry): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', `trading survivability ${entry.flow} · ${entry.detailJa}`);
}

export function simulateLongSessionTradingSoak(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'long-session trading soak');
}

export function simulateWebsocketChaosTrading(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'websocket chaos trading scenario');
}

export function simulateBatterySaverTrading(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'battery saver trading scenario');
}

export function simulateBridgeOverloadAiConcierge(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'bridge overload AI concierge scenario');
}

export function simulateThermalMarketPolling(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'thermal market polling scenario');
}

export function simulateReclaimTradingRecovery(): void {
  if (!soakHookEnabled) return;
  recordSoakTimeline('checkpoint', 'reclaim trading recovery scenario');
}
