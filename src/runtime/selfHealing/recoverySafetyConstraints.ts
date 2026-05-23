/**
 * Recovery safety — foreground/session only; no stealth or governance bypass.
 */
import { FORBIDDEN_SELF_HEALING_ACTIONS } from '../../constants/runtimeSelfHealing';

export function isSelfHealingAllowed(appForeground: boolean, offlineMode: boolean): boolean {
  if (!appForeground) return false;
  return true;
}

export function auditSelfHealingAction(actionJa: string): { allowed: boolean; reasonJa: string } {
  const blob = actionJa.toLowerCase().replace(/[\s_-]/g, '');
  for (const forbidden of FORBIDDEN_SELF_HEALING_ACTIONS) {
    const token = forbidden.replace(/_/g, '');
    if (blob.includes(token)) {
      return { allowed: false, reasonJa: `forbidden: ${forbidden}` };
    }
  }
  return { allowed: true, reasonJa: 'ok' };
}

export function assertForegroundSelfHealing(appForeground: boolean): boolean {
  return appForeground;
}
