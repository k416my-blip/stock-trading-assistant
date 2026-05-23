/**
 * Curiosity storage — sandbox clones, cemetery, replay archive (production immutable).
 */
import type {
  ExplorationCemeteryEntry,
  SandboxGraphClone,
  SandboxMutation,
  SandboxReplayArchive,
} from '../../types/runtimeCuriosity';
import { MAX_EXPLORATION_CEMETERY, MAX_SANDBOX_MUTATIONS } from '../../constants/runtimeCuriosity';

let sandboxSeq = 0;
let mutationSeq = 0;
let cemeterySeq = 0;
let replaySeq = 0;
let lastTickAtMs = 0;
let dormantRevivalsThisTick = 0;
let replaysThisTick = 0;
let dormantRevivalTotal = 0;
let syntheticScenarioTotal = 0;
let productionMutationsBlocked = 0;

const sandboxes: SandboxGraphClone[] = [];
const cemetery: ExplorationCemeteryEntry[] = [];
const replayArchives: SandboxReplayArchive[] = [];

export function resetCuriosityStorageForTest(): void {
  sandboxSeq = 0;
  mutationSeq = 0;
  cemeterySeq = 0;
  replaySeq = 0;
  lastTickAtMs = 0;
  dormantRevivalsThisTick = 0;
  replaysThisTick = 0;
  dormantRevivalTotal = 0;
  syntheticScenarioTotal = 0;
  productionMutationsBlocked = 0;
  sandboxes.length = 0;
  cemetery.length = 0;
  replayArchives.length = 0;
}

export function beginCuriosityTick(): void {
  dormantRevivalsThisTick = 0;
  replaysThisTick = 0;
}

export function noteCuriosityTickComplete(nowMs = Date.now()): void {
  lastTickAtMs = nowMs;
}

export function getLastCuriosityTickMs(): number {
  return lastTickAtMs;
}

export function canDormantRevivalThisTick(): boolean {
  return dormantRevivalsThisTick < 1;
}

export function noteDormantRevival(): void {
  dormantRevivalsThisTick += 1;
  dormantRevivalTotal += 1;
}

export function getDormantRevivalCount(): number {
  return dormantRevivalTotal;
}

export function noteSyntheticScenario(): void {
  syntheticScenarioTotal += 1;
}

export function getSyntheticScenarioCount(): number {
  return syntheticScenarioTotal;
}

export function noteProductionMutationBlocked(): void {
  productionMutationsBlocked += 1;
}

export function getProductionMutationsBlocked(): number {
  return productionMutationsBlocked;
}

export function setLastCuriosityTickMsForTest(ms: number): void {
  lastTickAtMs = ms;
}

export function canSandboxReplayThisTick(): boolean {
  return replaysThisTick < 3;
}

export function noteSandboxReplay(): void {
  replaysThisTick += 1;
}

export function createSandboxClone(
  productionEdges: Record<string, { edgeKey: string; runtimeLearnedWeight: number; from: string; to: string }>,
): SandboxGraphClone {
  sandboxSeq += 1;
  const edges: SandboxGraphClone['edges'] = {};
  for (const [k, e] of Object.entries(productionEdges)) {
    edges[k] = { edgeKey: e.edgeKey, weight: e.runtimeLearnedWeight, from: String(e.from), to: String(e.to) };
  }
  const clone: SandboxGraphClone = {
    id: `sandbox-${sandboxSeq}`,
    clonedAt: new Date().toISOString(),
    edges,
    mutations: [],
  };
  sandboxes.push(clone);
  if (sandboxes.length > 4) sandboxes.shift();
  return clone;
}

export function getActiveSandbox(): SandboxGraphClone | null {
  return sandboxes.at(-1) ?? null;
}

export function appendSandboxMutation(
  sandbox: SandboxGraphClone,
  kind: SandboxMutation['kind'],
  detailJa: string,
  seed: number,
  success: boolean,
): SandboxMutation {
  mutationSeq += 1;
  const m: SandboxMutation = {
    id: `mut-${mutationSeq}`,
    kind,
    at: new Date().toISOString(),
    detailJa: detailJa.slice(0, 100),
    deterministicSeed: seed,
    success,
    productionApplied: false,
  };
  sandbox.mutations.push(m);
  while (sandbox.mutations.length > MAX_SANDBOX_MUTATIONS) sandbox.mutations.shift();
  if (!success) {
    cemeterySeq += 1;
    cemetery.push({
      id: `cem-${cemeterySeq}`,
      mutationId: m.id,
      reasonJa: detailJa.slice(0, 80),
      archivedAt: m.at,
      recoverable: true,
    });
    if (cemetery.length > MAX_EXPLORATION_CEMETERY) cemetery.shift();
  }
  return m;
}

export function archiveDeterministicReplay(seed: number, scenarioJa: string, outcomeJa: string): SandboxReplayArchive {
  replaySeq += 1;
  const rec: SandboxReplayArchive = {
    id: `sreplay-${replaySeq}`,
    seed,
    scenarioJa: scenarioJa.slice(0, 80),
    outcomeJa: outcomeJa.slice(0, 80),
    at: new Date().toISOString(),
    deterministic: true,
  };
  replayArchives.push(rec);
  if (replayArchives.length > 64) replayArchives.shift();
  return rec;
}

export function getCuriosityStorageStats(): {
  mutationSandboxCount: number;
  explorationCemeterySize: number;
  replayArchiveCount: number;
  sandboxFailureRate: number;
} {
  const allMutations = sandboxes.flatMap((s) => s.mutations);
  const failures = allMutations.filter((m) => !m.success).length;
  return {
    mutationSandboxCount: sandboxes.length,
    explorationCemeterySize: cemetery.length,
    replayArchiveCount: replayArchives.length,
    sandboxFailureRate: allMutations.length === 0 ? 0 : failures / allMutations.length,
  };
}

export function getExplorationCemetery(): ExplorationCemeteryEntry[] {
  return [...cemetery];
}

export function getReplayArchives(): SandboxReplayArchive[] {
  return [...replayArchives];
}
