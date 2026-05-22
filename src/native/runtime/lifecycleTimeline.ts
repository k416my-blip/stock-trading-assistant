import { LIFECYCLE_TIMELINE_MAX } from '../../constants/nativeRuntimeBridge';
import type { LifecycleTimelineEvent, LifecycleTimelineEventKind } from '../../types/nativeRuntimeBridge';

const events: LifecycleTimelineEvent[] = [];

export function resetLifecycleTimelineForTest(): void {
  events.length = 0;
}

export function recordLifecycleEvent(
  kind: LifecycleTimelineEventKind,
  detailJa: string,
  native: boolean,
): void {
  events.push({
    at: new Date().toISOString(),
    kind,
    detailJa,
    native,
  });
  if (events.length > LIFECYCLE_TIMELINE_MAX) {
    events.shift();
  }
}

export function getLifecycleTimeline(): LifecycleTimelineEvent[] {
  return [...events];
}

/** Compact ASCII timeline for dashboard (no UI redesign — text visualization). */
export function formatLifecycleTimelineVisualization(): string {
  if (events.length === 0) return '—';
  return events
    .slice(-12)
    .map((e) => {
      const t = new Date(e.at);
      const hm = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`;
      const tag = e.native ? 'N' : 'H';
      return `${hm}${tag}:${e.kind.slice(0, 3)}`;
    })
    .join(' → ');
}
