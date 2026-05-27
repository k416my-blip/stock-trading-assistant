const quarantined: { id: string; at: string }[] = [];

export function resetPersistenceCorruptionQuarantineForTest(): void {
  quarantined.length = 0;
}

export function quarantineCorruptSnapshot(id: string): void {
  quarantined.push({ id, at: new Date().toISOString() });
  if (quarantined.length > 32) quarantined.shift();
}

export function getQuarantinedSnapshotCount(): number {
  return quarantined.length;
}

export function listQuarantinedSnapshots(): readonly { id: string; at: string }[] {
  return quarantined;
}

export function computePersistenceCorruptionRisk(
  integrityScore: number,
  quarantineCount: number,
): number {
  const base = Math.max(0, 1 - integrityScore);
  const q = Math.min(0.4, quarantineCount * 0.08);
  return Math.round(Math.min(1, base + q) * 1000) / 1000;
}
