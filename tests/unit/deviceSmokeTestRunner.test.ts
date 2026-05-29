import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createDefaultAppState } from '../../src/services/storage';
import type { DeviceSmokeTestContext } from '../../src/services/deviceSmokeTestRunner';

const probeNetworkReachable = vi.fn();
const isExpoGo = vi.fn();
const getPerformanceCostSnapshot = vi.fn();
const loadAppStateTrusted = vi.fn();

vi.mock('../../src/services/networkReachability', () => ({
  probeNetworkReachable: (...args: unknown[]) => probeNetworkReachable(...args),
}));

vi.mock('../../src/utils/runtimeEnvironment', () => ({
  isExpoGo: () => isExpoGo(),
  areNotificationsSupported: () => !isExpoGo(),
}));

vi.mock('../../src/services/performanceCostRuntime', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/performanceCostRuntime')>();
  return {
    ...actual,
    getPerformanceCostSnapshot: () => getPerformanceCostSnapshot(),
  };
});

vi.mock('../../src/services/storage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/storage')>();
  return {
    ...actual,
    loadAppStateTrusted: (...args: unknown[]) => loadAppStateTrusted(...args),
  };
});

import {
  computeSmokeTestStats,
  EXPO_GO_COLD_OFFLINE_NOTE,
  runAllDeviceSmokeTests,
  runDeviceSmokeTest,
  type SmokeTestRunLog,
} from '../../src/services/deviceSmokeTestRunner';

function baseCtx(overrides: Partial<DeviceSmokeTestContext> = {}): DeviceSmokeTestContext {
  return {
    state: createDefaultAppState(),
    degradedMode: false,
    killSwitches: {
      version: 1,
      readOnlyMode: false,
      disableMarketRefresh: false,
      disableTradeSubmission: false,
    },
    hasTwelveDataKey: false,
    securityWarnings: [],
    ...overrides,
  };
}

describe('deviceSmokeTestRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadAppStateTrusted.mockResolvedValue({
      trusted: true,
      state: createDefaultAppState(),
      warnings: [],
    });
    getPerformanceCostSnapshot.mockReturnValue({ offlineMode: false });
    isExpoGo.mockReturnValue(false);
    probeNetworkReachable.mockResolvedValue(true);
  });

  it('computeSmokeTestStats excludes WARNING from pass rate denominator', () => {
    const logs: SmokeTestRunLog[] = [
      {
        testId: 'fresh_install',
        titleJa: 'A',
        startedAt: '',
        finishedAt: '',
        result: 'pass',
        message: '',
        error: null,
        durationMs: 1,
      },
      {
        testId: 'app_restart',
        titleJa: 'B',
        startedAt: '',
        finishedAt: '',
        result: 'warning',
        message: '',
        error: null,
        durationMs: 1,
      },
      {
        testId: 'phone_offline',
        titleJa: 'C',
        startedAt: '',
        finishedAt: '',
        result: 'fail',
        message: '',
        error: null,
        durationMs: 1,
      },
    ];
    const stats = computeSmokeTestStats(logs);
    expect(stats.pass).toBe(1);
    expect(stats.warning).toBe(1);
    expect(stats.fail).toBe(1);
    expect(stats.passRatePct).toBe(50);
  });

  it('phone_offline warns when online and includes Expo Go cold-start note', async () => {
    isExpoGo.mockReturnValue(true);
    probeNetworkReachable.mockResolvedValue(true);

    const log = await runDeviceSmokeTest('phone_offline', baseCtx());
    expect(log.result).toBe('warning');
    expect(log.message).toContain(EXPO_GO_COLD_OFFLINE_NOTE);
    expect(log.message).toContain('機内モード');
  });

  it('phone_offline passes offline runtime checks', async () => {
    probeNetworkReachable.mockResolvedValue(false);
    getPerformanceCostSnapshot.mockReturnValue({ offlineMode: true });

    const log = await runDeviceSmokeTest(
      'phone_offline',
      baseCtx({
        securityWarnings: ['ネットワーク未接続 — キャッシュデータで起動しています'],
      }),
    );
    expect(log.result).toBe('pass');
    expect(log.message).toContain('オフライン耐性OK');
  });

  it('phone_offline never fails in Expo Go', async () => {
    isExpoGo.mockReturnValue(true);
    loadAppStateTrusted.mockResolvedValue({
      trusted: false,
      state: createDefaultAppState(),
      warnings: ['corrupt'],
    });

    const log = await runDeviceSmokeTest('phone_offline', baseCtx());
    expect(log.result).toBe('warning');
    expect(log.message).toContain(EXPO_GO_COLD_OFFLINE_NOTE);
  });

  it('runs full device smoke test batch', async () => {
    const logs = await runAllDeviceSmokeTests(baseCtx());
    const stats = computeSmokeTestStats(logs);
    console.log('[device-smoke-test-batch-stats]', JSON.stringify(stats));
    expect(stats.total).toBe(14);
    expect(stats.pass + stats.warning + stats.fail).toBeLessThanOrEqual(14);
  });
});
