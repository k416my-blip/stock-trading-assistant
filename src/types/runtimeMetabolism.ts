export type MetabolismDisposition = 'active' | 'decayed' | 'tombstone' | 'archived' | 'buried' | 'isolated';

export type TombstoneEdgeRecord = {
  edgeKey: string;
  from: string;
  to: string;
  relation: string;
  weightAtBurial: number;
  tombstonedAt: string;
  reasonJa: string;
  recoverable: true;
};

export type ArchivedReplayRecord = {
  id: string;
  replayIndex: number;
  weight: number;
  archivedAt: string;
  reasonJa: string;
  recoverable: true;
};

export type BuriedGraphNode = {
  nodeKey: string;
  kind: 'edge' | 'transition' | 'latent';
  buriedAt: string;
  lastUsedAt: string;
  disposition: 'buried' | 'dormant';
};

export type ToxicMemoryRecord = {
  id: string;
  kind: 'contradiction' | 'unsupported' | 'corrupt';
  detailJa: string;
  isolatedAt: string;
  sourceKey: string;
};

export type GcAuditEntry = {
  id: string;
  at: string;
  action: string;
  target: string;
  disposition: MetabolismDisposition;
  detailJa: string;
};

export type MetabolismGcMode =
  | 'deferred'
  | 'light'
  | 'tombstone_only'
  | 'standard'
  | 'frozen';

export type MetabolismDashboard = {
  metabolicHealth: number;
  memoryNutritionScore: number;
  obsoleteReplayCount: number;
  staleEdgeCount: number;
  buriedGraphNodes: number;
  replayCemeterySize: number;
  entropyDetoxScore: number;
  fossilizedRollbackRisk: number;
  selfHealingAddictionRisk: number;
  runtimeCalorieUsed: number;
  heapEcologyScore: number;
  toxicMemoryCount: number;
  lastGcAt: string | null;
  nextGcReason: string;
  gcMode: MetabolismGcMode;
};

export type RuntimeMetabolismBundle = {
  version: string;
  builtAt: string;
  dashboard: MetabolismDashboard;
  auditTrail: GcAuditEntry[];
  tombstoneCount: number;
  recoveredAvailable: boolean;
};

export type RedmiMetabolismReport = {
  deviceModel: string;
  metabolicHealth: number;
  memoryNutritionScore: number;
  heapEcologyScore: number;
  gcMode: MetabolismGcMode;
  summaryJa: string;
};
