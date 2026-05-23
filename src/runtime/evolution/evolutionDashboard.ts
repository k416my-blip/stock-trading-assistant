/**
 * Evolution Dashboard — meta runtime evolution health aggregation.
 */
import type {
  EvolutionDashboard,
  RuntimeEvolutionBundle,
} from '../../types/runtimeEvolution';

export function resetEvolutionDashboardForTest(): void {
  /* stateless aggregator */
}

export function buildEvolutionDashboard(bundle: Omit<RuntimeEvolutionBundle, 'dashboard'>): EvolutionDashboard {
  const graphRigidity = Math.max(
    0,
    1 - bundle.signals.graphMutationRate - bundle.entropy.entropyScore * 0.3,
  );

  const explorationRecoveryRate =
    bundle.exploration.dormantEdgesRevived +
      bundle.exploration.alternativePathsOpened +
      bundle.exploration.lowRiskReplays >
    0
      ? Math.min(
          1,
          (bundle.exploration.dormantEdgesRevived + bundle.exploration.alternativePathsOpened) / 5,
        )
      : 0;

  const hiddenDriftRisk =
    bundle.falseStability.state === 'HIDDEN_DRIFT'
      ? 0.85
      : bundle.falseStability.state === 'LATENT_COLLAPSE'
        ? 0.75
        : bundle.falseStability.state === 'FALSE_STABLE'
          ? 0.65
          : Math.min(0.5, bundle.signals.learningStagnation * 0.4);

  return {
    evolutionHealth: bundle.healthState,
    entropyScore: bundle.entropy.entropyScore,
    replayBias: bundle.replayBias.replayBiasScore,
    rollbackDependency: bundle.rollbackDependency.rollbackPenalty,
    adaptiveDiversity: bundle.signals.adaptationDiversity,
    graphRigidity: Math.round(graphRigidity * 1000) / 1000,
    explorationRecoveryRate: Math.round(explorationRecoveryRate * 1000) / 1000,
    hiddenDriftRisk: Math.round(hiddenDriftRisk * 1000) / 1000,
    longTermPhase: bundle.longTermPhase,
    falseStability: bundle.falseStability.state,
  };
}

export function formatEvolutionDashboardMarkdown(dashboard: EvolutionDashboard): string {
  return [
    '# Meta Runtime Evolution Dashboard',
    '',
    `**Health:** ${dashboard.evolutionHealth}`,
    `**Long-term phase:** ${dashboard.longTermPhase}`,
    `**Entropy:** ${dashboard.entropyScore}`,
    `**Replay bias:** ${dashboard.replayBias}`,
    `**Rollback dependency:** ${dashboard.rollbackDependency}`,
    `**Adaptive diversity:** ${dashboard.adaptiveDiversity}`,
    `**Graph rigidity:** ${dashboard.graphRigidity}`,
    `**Exploration recovery:** ${dashboard.explorationRecoveryRate}`,
    `**Hidden drift risk:** ${dashboard.hiddenDriftRisk}`,
    `**False stability:** ${dashboard.falseStability}`,
  ].join('\n');
}
