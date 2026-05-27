const modeHistory: string[] = [];

export function resetGovernanceThrashingSuppressorForTest(): void {
  modeHistory.length = 0;
}

export function noteGovernanceMode(mode: string): void {
  modeHistory.push(mode);
  if (modeHistory.length > 24) modeHistory.shift();
}

export function scoreGovernanceThrashRisk(): number {
  if (modeHistory.length < 3) return 0;
  const unique = new Set(modeHistory.slice(-8)).size;
  return Math.round(Math.min(1, unique / 6) * 1000) / 1000;
}

export function shouldSuppressGovernanceTransition(): boolean {
  return scoreGovernanceThrashRisk() > 0.5;
}
