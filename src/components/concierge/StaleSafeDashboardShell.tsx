import { memo, type ReactNode } from 'react';
import { useLayerRuntimeSchedulePlan } from '../../hooks/useConciergeDashboardSlices';
import { useProactiveConciergeOptional } from '../../context/ProactiveConciergeContext';

type Props<T extends { generatedAt: string }> = {
  bundle: T | null;
  children: (bundle: T) => ReactNode;
  testID?: string;
};

/**
 * Suppresses dashboard subtree when cascade guard requests rerender suppression
 * or bundle is unchanged (parent passes memoized bundle).
 */
function StaleSafeDashboardShellInner<T extends { generatedAt: string }>({
  bundle,
  children,
  testID,
}: Props<T>) {
  const cascade = useProactiveConciergeOptional()?.crossLayerCascadeEvaluation;
  const layerPlan = useLayerRuntimeSchedulePlan();

  if (!bundle) return null;
  if (cascade?.actions.rerenderSuppression && layerPlan?.actions.uiUpdateThrottle) {
    return null;
  }

  return <>{children(bundle)}</>;
}

export const StaleSafeDashboardShell = memo(
  StaleSafeDashboardShellInner,
) as typeof StaleSafeDashboardShellInner;
