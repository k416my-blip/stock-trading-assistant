/**
 * Runtime Senate Dashboard — constitutional equilibrium visualization.
 */
import type {
  RuntimeConstitutionBundle,
  SenateDashboard,
} from '../../types/runtimeConstitution';
import { computeEquilibriumScore } from './runtimeConstitutionCoordinator';

export function buildSenateDashboard(
  partial: Omit<RuntimeConstitutionBundle, 'senate'>,
): SenateDashboard {
  const cooperationRatio =
    partial.conflicts.conflicts.length === 0
      ? 1
      : Math.max(0, 1 - partial.conflicts.conflictSeverity);

  const layerAggression = { ...partial.pressures };

  return {
    dominantLayer: partial.powerBalance.dominantLayer,
    suppressedLayers: partial.powerBalance.suppressedLayers,
    constitutionalTension: partial.conflicts.conflictSeverity,
    equilibriumScore: computeEquilibriumScore(partial.pressures),
    cooperationRatio: Math.round(cooperationRatio * 1000) / 1000,
    layerAggression,
    budgetFairness: partial.budget.fairnessScore,
    collapseRisk: partial.collapse.level,
  };
}

export function formatSenateDashboardMarkdown(dashboard: SenateDashboard): string {
  return [
    '# Runtime Senate Dashboard',
    '',
    `**Dominant layer:** ${dashboard.dominantLayer}`,
    `**Equilibrium:** ${dashboard.equilibriumScore}`,
    `**Tension:** ${dashboard.constitutionalTension}`,
    `**Cooperation:** ${dashboard.cooperationRatio}`,
    `**Budget fairness:** ${dashboard.budgetFairness}`,
    `**Collapse risk:** ${dashboard.collapseRisk}`,
    `**Suppressed:** ${dashboard.suppressedLayers.join(', ') || 'none'}`,
  ].join('\n');
}
