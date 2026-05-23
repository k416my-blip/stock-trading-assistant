import { RN_OBJECT_CHURN_WARN } from '../../constants/rnBridgeSurvivability';

let identityCreates = 0;
let windowStart = Date.now();

export function resetObjectIdentityChurnTrackerForTest(): void {
  identityCreates = 0;
  windowStart = Date.now();
}

export function noteObjectIdentityCreate(): void {
  identityCreates += 1;
}

export function getObjectChurnRatePerMin(): number {
  const minutes = Math.max(0.01, (Date.now() - windowStart) / 60_000);
  const rate = identityCreates / minutes;
  if (Date.now() - windowStart > 60_000) {
    identityCreates = 0;
    windowStart = Date.now();
  }
  return Math.min(RN_OBJECT_CHURN_WARN * 2, Math.round(rate));
}
