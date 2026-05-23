import { RN_LISTENER_LEAK_WARN } from '../../constants/rnBridgeSurvivability';
import { getActiveSubscriptionCount, getUndisposedSubscriptionCount } from './subscriptionLifecycleAuditor';

export function detectListenerLeakRisk(): number {
  const active = getActiveSubscriptionCount();
  if (active === 0) return 0;
  const undisposed = getUndisposedSubscriptionCount();
  return Math.min(1, undisposed / Math.max(1, active) + (undisposed > 3 ? 0.2 : 0));
}

export function isListenerLeakElevated(): boolean {
  return detectListenerLeakRisk() >= RN_LISTENER_LEAK_WARN;
}
