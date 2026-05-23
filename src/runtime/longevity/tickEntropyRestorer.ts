export function restoreTickEntropy(entropyScore: number, bias: number): number {
  return Math.round(Math.max(0.05, Math.min(0.95, entropyScore + bias)) * 1000) / 1000;
}
