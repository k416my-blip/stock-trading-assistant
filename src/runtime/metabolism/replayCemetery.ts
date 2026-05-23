/**
 * Replay Cemetery — archived replays (recoverable).
 */
import { getReplayCemetery, archiveReplay } from './metabolismStorage';

export { archiveReplay, getReplayCemetery };

export function getReplayCemeterySize(): number {
  return getReplayCemetery().length;
}
