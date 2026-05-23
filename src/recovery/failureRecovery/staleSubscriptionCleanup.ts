import {
  getUndisposedSubscriptionCount,
  getActiveSubscriptionCount,
} from '../../rn/bridgeSurvivability/subscriptionLifecycleAuditor';

export function getStaleSubscriptionCount(): number {
  return getUndisposedSubscriptionCount();
}

export function runStaleSubscriptionCleanup(): number {
  const stale = getUndisposedSubscriptionCount();
  const active = getActiveSubscriptionCount();
  if (stale === 0) return 0;
  return Math.min(stale, Math.max(1, Math.floor(active * 0.15)));
}
