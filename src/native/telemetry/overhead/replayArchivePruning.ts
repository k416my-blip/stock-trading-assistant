import { TELEMETRY_REPLAY_ARCHIVE_MAX } from '../../../constants/telemetryOverhead';

export function pruneReplayArchive<T>(items: T[], max = TELEMETRY_REPLAY_ARCHIVE_MAX): T[] {
  if (items.length <= max) return items;
  const head = Math.floor(max * 0.25);
  const tail = max - head;
  return [...items.slice(0, head), ...items.slice(-tail)];
}
