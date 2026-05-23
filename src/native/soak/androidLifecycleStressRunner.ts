import type { SoakLifecycleEvent } from '../../types/automatedSoakRunner';
import { AppState } from 'react-native';
import { recordSoakTimeline } from './sessionTimelineRecorder';

const lifecycleLog: SoakLifecycleEvent[] = [];
let screenOff = false;
let unsub: (() => void) | null = null;

export function resetAndroidLifecycleStressForTest(): void {
  lifecycleLog.length = 0;
  screenOff = false;
  unsub?.();
  unsub = null;
}

export function initAndroidLifecycleStressRunner(): void {
  if (unsub) return;
  const sub = AppState.addEventListener('change', (next) => {
    const phase =
      next === 'active' ? 'foreground' : next === 'background' ? 'background' : next === 'inactive' ? 'inactive' : 'screen_off';
    if (next === 'inactive') screenOff = true;
    if (next === 'active') screenOff = false;
    const evt: SoakLifecycleEvent = {
      at: new Date().toISOString(),
      phase,
      detailJa: `AppState → ${next}`,
    };
    lifecycleLog.push(evt);
    if (lifecycleLog.length > 300) lifecycleLog.shift();
    recordSoakTimeline('lifecycle', evt.detailJa);
  });
  unsub = () => sub.remove();
}

export function isScreenOff(): boolean {
  return screenOff || AppState.currentState === 'inactive';
}

export function getLifecycleTimeline(): SoakLifecycleEvent[] {
  return [...lifecycleLog];
}

export function getLifecycleRecent(limit = 6): SoakLifecycleEvent[] {
  return lifecycleLog.slice(-limit);
}

export function runAndroidLifecycleStressObserveStep(): string {
  const last = lifecycleLog.at(-1);
  return last ? `lifecycle observe · ${last.phase}` : 'lifecycle observe · awaiting AppState';
}
