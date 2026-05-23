/**
 * Memory relevance half-life — decay factor by age.
 */
import {
  HALF_LIFE_EDGE_MS,
  HALF_LIFE_EXPLANATION_MS,
  HALF_LIFE_GOVERNANCE_MS,
  HALF_LIFE_REPLAY_MS,
} from '../../constants/runtimeMetabolism';

export function halfLifeDecay(ageMs: number, halfLifeMs: number): number {
  if (ageMs <= 0 || halfLifeMs <= 0) return 1;
  return Math.pow(0.5, ageMs / halfLifeMs);
}

export function edgeRelevance(ageMs: number): number {
  return halfLifeDecay(ageMs, HALF_LIFE_EDGE_MS);
}

export function replayRelevance(ageMs: number): number {
  return halfLifeDecay(ageMs, HALF_LIFE_REPLAY_MS);
}

export function explanationRelevance(ageMs: number): number {
  return halfLifeDecay(ageMs, HALF_LIFE_EXPLANATION_MS);
}

export function governanceRelevance(ageMs: number): number {
  return halfLifeDecay(ageMs, HALF_LIFE_GOVERNANCE_MS);
}
