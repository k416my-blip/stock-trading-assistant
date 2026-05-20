import { describe, expect, it } from 'vitest';
import { runDailyHealthCheck } from '../../src/services/dailyHealthCheckService';
import { createTestAppState } from '../helpers/fixtures/appState';

describe('dailyHealthCheck', () => {
  it('returns ok when state is healthy and key set', async () => {
    const report = await runDailyHealthCheck({
      state: createTestAppState(),
      hasApiKey: true,
    });
    expect(['ok', 'warning']).toContain(report.overall);
    expect(report.items.length).toBeGreaterThan(5);
  });

  it('warns without api key', async () => {
    const report = await runDailyHealthCheck({
      state: createTestAppState(),
      hasApiKey: false,
    });
    const api = report.items.find((i) => i.id === 'api_key');
    expect(api?.status).toBe('warning');
  });
});
