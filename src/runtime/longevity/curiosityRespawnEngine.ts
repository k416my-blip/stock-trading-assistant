/** Sandbox-only curiosity respawn — no production apply. */
export function respawnSandboxCuriosity(seed: number): { respawned: boolean; detailJa: string } {
  return {
    respawned: seed % 3 !== 0,
    detailJa: `sandbox curiosity respawn seed=${seed}`,
  };
}
