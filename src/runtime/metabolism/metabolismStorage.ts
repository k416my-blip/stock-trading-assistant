/**
 * Metabolism storage — tombstones, cemetery, audit (recoverable, no physical delete).
 */
import type {
  ArchivedReplayRecord,
  BuriedGraphNode,
  GcAuditEntry,
  TombstoneEdgeRecord,
  ToxicMemoryRecord,
} from '../../types/runtimeMetabolism';
import { MAX_AUDIT_TRAIL, MAX_REPLAY_CEMETERY, MAX_TOMBSTONES } from '../../constants/runtimeMetabolism';

let auditSeq = 0;
let tombstoneSeq = 0;
let replaySeq = 0;
let toxicSeq = 0;

const edgeTombstones = new Map<string, TombstoneEdgeRecord>();
const replayCemetery: ArchivedReplayRecord[] = [];
const buriedNodes = new Map<string, BuriedGraphNode>();
const toxicMemories: ToxicMemoryRecord[] = [];
const auditTrail: GcAuditEntry[] = [];
let lastGcAt: string | null = null;
let lastGcAtMs = 0;
let selfHealingPassCount = 0;

export function resetMetabolismStorageForTest(): void {
  auditSeq = 0;
  tombstoneSeq = 0;
  replaySeq = 0;
  toxicSeq = 0;
  edgeTombstones.clear();
  replayCemetery.length = 0;
  buriedNodes.clear();
  toxicMemories.length = 0;
  auditTrail.length = 0;
  lastGcAt = null;
  lastGcAtMs = 0;
  selfHealingPassCount = 0;
}

export function noteSelfHealingPassForMetabolism(): void {
  selfHealingPassCount += 1;
}

export function getSelfHealingPassCount(): number {
  return selfHealingPassCount;
}

export function appendGcAudit(
  action: string,
  target: string,
  disposition: GcAuditEntry['disposition'],
  detailJa: string,
): GcAuditEntry {
  auditSeq += 1;
  const entry: GcAuditEntry = {
    id: `gc-${auditSeq}`,
    at: new Date().toISOString(),
    action,
    target,
    disposition,
    detailJa,
  };
  auditTrail.push(entry);
  while (auditTrail.length > MAX_AUDIT_TRAIL) auditTrail.shift();
  return entry;
}

export function tombstoneEdge(
  edgeKey: string,
  from: string,
  to: string,
  relation: string,
  weight: number,
  reasonJa: string,
): TombstoneEdgeRecord | null {
  if (edgeTombstones.has(edgeKey) || edgeTombstones.size >= MAX_TOMBSTONES) return null;
  tombstoneSeq += 1;
  const rec: TombstoneEdgeRecord = {
    edgeKey,
    from,
    to,
    relation,
    weightAtBurial: weight,
    tombstonedAt: new Date().toISOString(),
    reasonJa,
    recoverable: true,
  };
  edgeTombstones.set(edgeKey, rec);
  appendGcAudit('stale_edge_tombstone', edgeKey, 'tombstone', reasonJa);
  return rec;
}

export function archiveReplay(replayIndex: number, weight: number, reasonJa: string): void {
  if (replayCemetery.length >= MAX_REPLAY_CEMETERY) replayCemetery.shift();
  replaySeq += 1;
  replayCemetery.push({
    id: `replay-${replaySeq}`,
    replayIndex,
    weight,
    archivedAt: new Date().toISOString(),
    reasonJa,
    recoverable: true,
  });
  appendGcAudit('replay_archive', `replay-${replayIndex}`, 'archived', reasonJa);
}

export function buryGraphNode(nodeKey: string, kind: BuriedGraphNode['kind'], lastUsedAt: string): void {
  buriedNodes.set(nodeKey, {
    nodeKey,
    kind,
    buriedAt: new Date().toISOString(),
    lastUsedAt,
    disposition: 'buried',
  });
  appendGcAudit('graph_bury', nodeKey, 'buried', 'dormant graph burial');
}

export function isolateToxicMemory(
  kind: ToxicMemoryRecord['kind'],
  sourceKey: string,
  detailJa: string,
): void {
  toxicSeq += 1;
  toxicMemories.push({
    id: `tox-${toxicSeq}`,
    kind,
    detailJa: detailJa.slice(0, 120),
    isolatedAt: new Date().toISOString(),
    sourceKey,
  });
  appendGcAudit('toxic_isolate', sourceKey, 'isolated', detailJa.slice(0, 80));
}

export function recoverTombstoneEdge(edgeKey: string): boolean {
  const t = edgeTombstones.get(edgeKey);
  if (!t) return false;
  edgeTombstones.delete(edgeKey);
  appendGcAudit('tombstone_recover', edgeKey, 'active', 'recovered from tombstone');
  return true;
}

export function markGcCompleted(): void {
  lastGcAt = new Date().toISOString();
  lastGcAtMs = Date.now();
}

export function getLastGcAt(): string | null {
  return lastGcAt;
}

export function getLastGcAtMs(): number {
  return lastGcAtMs;
}

export function setLastGcAtMsForTest(ms: number): void {
  lastGcAtMs = ms;
  lastGcAt = ms > 0 ? new Date(ms).toISOString() : null;
}

export function getMetabolismStorageStats(): {
  tombstoneCount: number;
  replayCemeterySize: number;
  buriedGraphNodes: number;
  toxicMemoryCount: number;
  auditCount: number;
} {
  return {
    tombstoneCount: edgeTombstones.size,
    replayCemeterySize: replayCemetery.length,
    buriedGraphNodes: buriedNodes.size,
    toxicMemoryCount: toxicMemories.length,
    auditCount: auditTrail.length,
  };
}

export function getAuditTrail(): GcAuditEntry[] {
  return [...auditTrail];
}

export function getTombstone(edgeKey: string): TombstoneEdgeRecord | undefined {
  return edgeTombstones.get(edgeKey);
}

export function getReplayCemetery(): ArchivedReplayRecord[] {
  return [...replayCemetery];
}

export function isEdgeTombstoned(edgeKey: string): boolean {
  return edgeTombstones.has(edgeKey);
}
