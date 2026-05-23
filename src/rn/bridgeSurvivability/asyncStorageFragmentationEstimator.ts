let writeCount = 0;
let keyCount = 0;

export function resetAsyncStorageFragmentationEstimatorForTest(): void {
  writeCount = 0;
  keyCount = 0;
}

export function noteAsyncStorageWrite(keys = 1): void {
  writeCount += 1;
  keyCount += keys;
}

export function estimateAsyncFragmentationScore(): number {
  if (writeCount === 0) return 0;
  const ratio = keyCount / writeCount;
  return Math.min(1, Math.round((ratio - 1) * 0.25 * 1000) / 1000);
}
