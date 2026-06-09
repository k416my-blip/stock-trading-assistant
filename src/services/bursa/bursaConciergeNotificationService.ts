/**
 * Bursa Phase 10 — AI通知 UI フォーマット
 */
import type { BursaPhase10Analysis } from '../../types/bursaDisclosure';
import { importanceStars } from './bursaConciergeNotificationBuilder';

export const CONCIERGE_NOTIFY_MISSING_JA = 'データ未取得';

export type ConciergeNotificationRow = {
  id: string;
  createdAtJa: string;
  stockCodeJa: string;
  companyNameJa: string;
  categoryJa: string;
  importanceJa: string;
  triggerKindJa: string;
  titleJa: string;
  messageJa: string;
  reasonsJa: string;
  isHolding: boolean;
  isRead: boolean;
};

export type ConciergeNotificationReport = {
  todayActionJa: string;
  todayReasonsJa: string[];
  topNotification: ConciergeNotificationRow | null;
  notifications: ConciergeNotificationRow[];
  unreadCount: number;
  soundEnabled: boolean;
  dataSourceLabel: string;
};

function mapRow(n: BursaPhase10Analysis['notifications'][0]): ConciergeNotificationRow {
  return {
    id: n.id,
    createdAtJa: n.createdAt,
    stockCodeJa: n.stockCode ?? CONCIERGE_NOTIFY_MISSING_JA,
    companyNameJa: n.companyName ?? CONCIERGE_NOTIFY_MISSING_JA,
    categoryJa: n.category,
    importanceJa: importanceStars(n.importance),
    triggerKindJa: n.triggerKind,
    titleJa: n.titleJa,
    messageJa: n.messageJa,
    reasonsJa: n.reasons.join(' · ') || CONCIERGE_NOTIFY_MISSING_JA,
    isHolding: n.isHolding,
    isRead: n.isRead,
  };
}

export function formatConciergeNotificationReport(
  phase10: BursaPhase10Analysis,
): ConciergeNotificationReport {
  const notifications = phase10.notifications.map(mapRow);
  return {
    todayActionJa: phase10.todayAction.actionJa,
    todayReasonsJa: phase10.todayAction.reasons,
    topNotification: phase10.topNotification ? mapRow(phase10.topNotification) : null,
    notifications,
    unreadCount: notifications.filter((n) => !n.isRead).length,
    soundEnabled: phase10.soundEnabled,
    dataSourceLabel: 'LIVE · KLSE Screener · Phase6–9 再計算 · 実データのみ',
  };
}
