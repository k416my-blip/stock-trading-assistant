let repairCount = 0;

export function resetPartialPersistenceRepairForTest(): void {
  repairCount = 0;
}

export function repairPartialPersistence(fieldsRepaired: number): number {
  if (fieldsRepaired <= 0) return repairCount;
  repairCount += fieldsRepaired;
  return repairCount;
}

export function getPersistenceRepairCount(): number {
  return repairCount;
}

export function estimatePartialFields(damagedRatio: number): number {
  if (damagedRatio <= 0) return 0;
  return Math.max(1, Math.ceil(damagedRatio * 6));
}
