import { EXPLANATION_COOLDOWN_MS } from '../constants/crossLayerCascade';
import type { SafeGovernanceRationale } from '../types/explainableGovernanceTransparentReasoning';

type CachedRationale = {
  hash: string;
  rationales: SafeGovernanceRationale[];
  cachedAt: number;
};

const rationaleCache = new Map<string, CachedRationale>();
const recentHashes: string[] = [];
let lastRegenerationAt = 0;

export function resetExplanationStormGuardForTest(): void {
  rationaleCache.clear();
  recentHashes.length = 0;
  lastRegenerationAt = 0;
}

function simpleHash(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = (h * 31 + text.charCodeAt(i)) | 0;
  }
  return `r-${(h >>> 0).toString(16)}`;
}

export function hashRationalePayload(rationales: SafeGovernanceRationale[]): string {
  const payload = rationales
    .map((r) => `${r.layerId}:${r.kind}:${r.rationaleJa}`)
    .sort()
    .join('|');
  return simpleHash(payload);
}

export function isExplanationCooldownActive(): boolean {
  return Date.now() - lastRegenerationAt < EXPLANATION_COOLDOWN_MS;
}

export function isSemanticDuplicate(hash: string): boolean {
  const recent = recentHashes.slice(-6);
  return recent.filter((h) => h === hash).length >= 2;
}

export function shouldRegenerateExplanation(hash: string): boolean {
  if (isExplanationCooldownActive()) return false;
  if (isSemanticDuplicate(hash)) return false;
  return true;
}

export function getCachedRationales(hash: string): SafeGovernanceRationale[] | null {
  const entry = rationaleCache.get(hash);
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > 120_000) {
    rationaleCache.delete(hash);
    return null;
  }
  return entry.rationales;
}

export function cacheRationales(hash: string, rationales: SafeGovernanceRationale[]): void {
  rationaleCache.set(hash, { hash, rationales, cachedAt: Date.now() });
  recentHashes.push(hash);
  if (recentHashes.length > 24) recentHashes.splice(0, recentHashes.length - 24);
  lastRegenerationAt = Date.now();
}

/** Apply storm guard — reuse cache or return fresh rationales. */
export function guardExplanationRegeneration(
  rationales: SafeGovernanceRationale[],
): SafeGovernanceRationale[] {
  const hash = hashRationalePayload(rationales);
  if (!shouldRegenerateExplanation(hash)) {
    const cached = getCachedRationales(hash);
    if (cached) return cached;
    return rationales.length > 0
      ? rationales.slice(0, Math.max(2, Math.min(4, rationales.length)))
      : rationales;
  }
  cacheRationales(hash, rationales);
  return rationales;
}

export function getExplanationCacheSize(): number {
  return rationaleCache.size;
}

export function getExplanationStormRiskPct(): number {
  const dup = recentHashes.length >= 4 ? recentHashes.slice(-4) : [];
  const dupRate = dup.length ? dup.filter((h, i, a) => a.indexOf(h) !== i).length * 25 : 0;
  const cooldown = isExplanationCooldownActive() ? 15 : 0;
  return Math.min(100, dupRate + cooldown + (rationaleCache.size > 12 ? 20 : 0));
}
