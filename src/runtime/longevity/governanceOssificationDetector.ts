import { getConstitutionalDirectives } from '../constitution/runtimeConstitutionIntegration';

export function detectGovernanceOssification(): { ossified: boolean; rigidity: number } {
  const d = getConstitutionalDirectives();
  const rigidity =
    (d.suppressExploration ? 0.35 : 0) +
    (d.replayFreeze ? 0.35 : 0) +
    (d.governanceThrottle < 0.6 ? 0.2 : 0) +
    (d.suppressRecovery ? 0.1 : 0);
  return {
    ossified: rigidity >= 0.6,
    rigidity: Math.round(Math.min(1, rigidity) * 1000) / 1000,
  };
}
