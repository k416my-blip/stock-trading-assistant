import { beforeEach, describe, expect, it } from 'vitest';
import {
  getPersonalKillSwitchesSnapshot,
  loadPersonalKillSwitches,
  resetPersonalKillSwitchesForTest,
  savePersonalKillSwitches,
} from '../../src/services/personalKillSwitches';

describe('personalKillSwitches', () => {
  beforeEach(() => {
    resetPersonalKillSwitchesForTest();
  });

  it('persists read-only mode', async () => {
    await savePersonalKillSwitches({ readOnlyMode: true });
    const loaded = await loadPersonalKillSwitches();
    expect(loaded.readOnlyMode).toBe(true);
    expect(getPersonalKillSwitchesSnapshot().readOnlyMode).toBe(true);
  });

  it('disables market refresh flag', async () => {
    await savePersonalKillSwitches({ disableMarketRefresh: true });
    expect(getPersonalKillSwitchesSnapshot().disableMarketRefresh).toBe(true);
  });
});
