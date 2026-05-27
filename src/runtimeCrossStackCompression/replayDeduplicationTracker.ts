export function resetReplayDeduplicationTrackerForTest(): void {
  /* stateless */
}

let replaySeen = 0;

export function trackReplayDedup(count: number): number {
  replaySeen += count;
  const ratio = replaySeen > 0 ? 1 - Math.min(1, 24 / replaySeen) : 0;
  return Math.round(ratio * 1000) / 1000;
}

export function resetReplayDedupForTest(): void {
  replaySeen = 0;
}
