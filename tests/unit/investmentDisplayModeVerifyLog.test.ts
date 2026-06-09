import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_AI_PREFERENCES } from '../../src/services/aiPreferencesStorage';
import { logInvestmentDisplayModeForDeviceVerify } from '../../src/services/investmentDisplayModeVerifyLog';
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('investmentDisplayModeVerifyLog', () => {
  it('logs current mode on boot for device verification', () => {
    logInvestmentDisplayModeForDeviceVerify(DEFAULT_AI_PREFERENCES);
    expect(warnSpy).toHaveBeenCalledWith('[INVESTMENT_DISPLAY_MODE] 現在モード', 'trust');
  });
});
