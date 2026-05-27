let interrupted = 0;
let recovered = 0;

export function resetInterruptedExportRecoveryForTest(): void {
  interrupted = 0;
  recovered = 0;
}

export function noteInterruptedExport(): void {
  interrupted += 1;
}

export function recoverInterruptedExport(success: boolean): number {
  if (success) recovered += 1;
  if (interrupted === 0) return 1;
  return Math.round((recovered / interrupted) * 100) / 100;
}

export function getInterruptedExportRecoveryRate(): number {
  if (interrupted === 0) return 1;
  return Math.round((recovered / interrupted) * 100) / 100;
}

export function hasPartialExportBundle(partialBytes: number, expectedBytes: number): boolean {
  return partialBytes > 0 && partialBytes < expectedBytes;
}
