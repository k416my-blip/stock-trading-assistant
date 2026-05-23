import type { ReconnectSource } from '../../types/reconnectEntry';
import type { WebsocketOwnershipRecord } from '../../types/nativeBoundaryValidation';
import { WEBSOCKET_OWNERSHIP_TRACE_MAX } from '../../constants/nativeBoundaryValidation';

const records: WebsocketOwnershipRecord[] = [];
const seenUuids = new Set<string>();

let uuidSeq = 0;

export function resetWebsocketOwnershipTraceForTest(): void {
  records.length = 0;
  seenUuids.clear();
  uuidSeq = 0;
}

export function createReconnectUuid(source: ReconnectSource | 'native'): string {
  uuidSeq += 1;
  return `rc-${source}-${uuidSeq}-${Date.now().toString(36)}`;
}

export function noteCoordinatorReconnectScheduled(
  reconnectUuid: string,
  source: ReconnectSource,
): void {
  const duplicate = seenUuids.has(reconnectUuid);
  seenUuids.add(reconnectUuid);
  records.push({
    reconnectUuid,
    owner: 'js_coordinator',
    source,
    scheduledAt: new Date().toISOString(),
    duplicate,
  });
  trim();
}

export function noteJsReconnectExecuted(reconnectUuid: string, delayMs: number): void {
  const row = records.find((r) => r.reconnectUuid === reconnectUuid);
  if (row) {
    row.executedAt = new Date().toISOString();
    row.owner = 'js_execute';
  } else {
    records.push({
      reconnectUuid,
      owner: 'js_execute',
      source: 'kernel_policy',
      scheduledAt: new Date().toISOString(),
      executedAt: new Date().toISOString(),
      duplicate: false,
    });
    recordOrphanExecute(reconnectUuid, delayMs);
  }
  trim();
}

function recordOrphanExecute(_uuid: string, _delayMs: number): void {
  // orphan execute without coordinator schedule — flagged via validation report
}

export function noteNativeUntaggedReconnectHint(reconnectUuid: string): void {
  records.push({
    reconnectUuid,
    owner: 'native_untagged',
    source: 'native',
    scheduledAt: new Date().toISOString(),
    duplicate: seenUuids.has(reconnectUuid),
  });
  seenUuids.add(reconnectUuid);
  trim();
}

function trim(): void {
  while (records.length > WEBSOCKET_OWNERSHIP_TRACE_MAX) records.shift();
}

export function getWebsocketOwnershipTrace(): WebsocketOwnershipRecord[] {
  return [...records];
}

export function getOrphanNativeReconnectCount(): number {
  return records.filter((r) => r.owner === 'native_untagged').length;
}

export function getUntaggedExecuteCount(): number {
  return records.filter((r) => r.owner === 'js_execute' && !r.scheduledAt).length;
}
