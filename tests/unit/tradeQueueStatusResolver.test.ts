import { describe, expect, it } from 'vitest';
import {
  formatResponseDeadlineJa,
  isActiveSignalStatus,
  resolveEffectiveQueueAckStatus,
} from '../../src/services/tradeQueueStatusResolver';

describe('tradeQueueStatusResolver', () => {
  it('treats only unacknowledged as active for header', () => {
    expect(isActiveSignalStatus('unacknowledged')).toBe(true);
    expect(isActiveSignalStatus('acknowledged')).toBe(false);
    expect(isActiveSignalStatus('expired')).toBe(false);
    expect(isActiveSignalStatus('disabled')).toBe(false);
  });

  it('auto-expires when deadline passed', () => {
    const now = Date.now();
    const status = resolveEffectiveQueueAckStatus(
      {
        id: 'x',
        responseDeadlineAt: new Date(now - 60_000).toISOString(),
      },
      {},
      now,
    );
    expect(status).toBe('expired');
  });

  it('formats deadline within minutes', () => {
    const ja = formatResponseDeadlineJa(new Date(Date.now() + 8 * 60_000).toISOString());
    expect(ja).toMatch(/分以内/);
  });
});
