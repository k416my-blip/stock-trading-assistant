import { useEffect, useRef, type DependencyList } from 'react';
import {
  getCurrentGeneration,
  isStaleAsyncGeneration,
  nextAsyncGeneration,
} from '../services/productionStability/asyncRaceGuard';
import { noteEffectRun } from '../services/productionStability/effectLoopDetector';

/** effect ループ検出 + 非同期競合ガード付き effect */
export function useStableAsyncEffect(
  effectName: string,
  effect: (generation: number, isStale: () => boolean) => void | (() => void),
  deps: DependencyList,
): void {
  const genRef = useRef(0);

  useEffect(() => {
    noteEffectRun(effectName);
    const generation = nextAsyncGeneration(effectName);
    genRef.current = generation;
    const isStale = () => isStaleAsyncGeneration(effectName, genRef.current);

    const cleanup = effect(generation, isStale);
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- named stable effects
  }, deps);
}

export function useAsyncGeneration(scope: string): {
  generation: number;
  isStale: () => boolean;
} {
  const genRef = useRef(getCurrentGeneration(scope));
  return {
    generation: genRef.current,
    isStale: () => isStaleAsyncGeneration(scope, genRef.current),
  };
}
