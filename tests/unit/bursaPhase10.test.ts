import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { parseBursaCompanyProfileFromHtml } from '../../src/services/bursa/bursaCompanyProfileService';
import { parseBursaQuarterlyFromHtml } from '../../src/services/bursa/bursaQuarterlyService';
import { parseBursaDividendFromHtml } from '../../src/services/bursa/bursaDividendService';
import {
  buildConciergeNotifications,
  buildTodayAction,
  importanceStars,
} from '../../src/services/bursa/bursaConciergeNotificationBuilder';
import { formatConciergeNotificationReport } from '../../src/services/bursa/bursaConciergeNotificationService';
import { inMemoryConciergeStorageBackend } from '../../src/services/bursa/bursaConciergeNotificationStorage';
import { buildBursaPhase6FromBundles } from '../../src/services/bursa/bursaPhase6Analysis';
import { buildBursaPhase7FromBundles } from '../../src/services/bursa/bursaPhase7Analysis';
import { buildBursaPhase8FromBundles } from '../../src/services/bursa/bursaPhase8Analysis';
import { buildBursaPhase9FromBundles } from '../../src/services/bursa/bursaPhase9Analysis';
import { buildBursaPhase10FromBundles } from '../../src/services/bursa/bursaPhase10Analysis';
import { inMemoryMonitoringStorageBackend } from '../../src/services/bursa/bursaMonitoringStorage';
import type { BursaDisclosureBundle } from '../../types/bursaDisclosure';
import type { PortfolioPosition } from '../../types';

const root = process.cwd();
const VERIFY_CODES = ['1155', '1066', '5819', '5183'];

function loadBundle(code: string): BursaDisclosureBundle | null {
  const path = join(root, `scripts/klse-sample-${code}.html`);
  if (!existsSync(path)) return null;
  const html = readFileSync(path, 'utf8');
  return {
    stockCode: code,
    profile: parseBursaCompanyProfileFromHtml(html, code),
    quarterly: parseBursaQuarterlyFromHtml(html, code),
    dividend: parseBursaDividendFromHtml(html, code),
    dataSource: 'klse_screener',
    fetchedFields: [],
    missingFields: [],
    apiNotes: [],
  };
}

function verifyHoldings(): PortfolioPosition[] {
  return VERIFY_CODES.map((code) => ({
    id: `h-${code}`,
    symbol: code,
    market: 'bursa' as const,
    shares: 1000,
    currentPrice: null,
    companyName: null,
  }));
}

describe('bursa Phase10 AI concierge notifications', () => {
  it('maps importance to star display', () => {
    expect(importanceStars(5)).toBe('★★★★★');
    expect(importanceStars(3)).toBe('★★★☆☆');
  });

  it('generates notifications from phase7-9 triggers', async () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const holdings = verifyHoldings();
    const phase7 = buildBursaPhase7FromBundles({ bundles, holdings });
    const phase8 = buildBursaPhase8FromBundles({ bundles, holdings });
    const phase9 = await buildBursaPhase9FromBundles({ bundles, holdings });

    const notifications = buildConciergeNotifications({
      phase7,
      phase8,
      phase9,
      at: '2026-06-02T00:00:00.000Z',
    });

    expect(notifications.length).toBeGreaterThan(0);
    const kinds = new Set(notifications.map((n) => n.triggerKind));
    expect(kinds.size).toBeGreaterThan(1);
    expect(notifications[0]!.importance).toBeGreaterThanOrEqual(1);
    expect(notifications.filter((n) => n.isHolding).length).toBeGreaterThan(0);
  });

  it('builds full phase10 report from 4-stock fixtures', async () => {
    const bundles = VERIFY_CODES.map(loadBundle).filter(Boolean) as BursaDisclosureBundle[];
    const holdings = verifyHoldings();
    const storage = inMemoryConciergeStorageBackend();
    const monitoringStorage = inMemoryMonitoringStorageBackend();

    const phase10 = await buildBursaPhase10FromBundles({
      bundles,
      holdings,
      storage,
      monitoringStorage,
      persist: true,
    });

    expect(phase10.notifications.length).toBeGreaterThan(0);
    expect(phase10.todayAction.actionJa).toContain('本日の最重要行動');
    expect(phase10.topNotification).not.toBeNull();

    const report = formatConciergeNotificationReport(phase10);
    expect(report.notifications.length).toBeGreaterThan(0);
    expect(report.todayActionJa).toBeTruthy();
  });
});
