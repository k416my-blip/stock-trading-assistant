let zombieHits = 0;

export function resetZombiePersistenceDetectorForTest(): void {
  zombieHits = 0;
}

export function detectZombiePersistence(staleHydrationRisk: number, corruptionRisk: number): boolean {
  if (staleHydrationRisk > 0.6 && corruptionRisk > 0.4) {
    zombieHits += 1;
    return true;
  }
  return false;
}

export function getZombiePersistenceHits(): number {
  return zombieHits;
}
