import { describe, expect, it } from 'vitest';
import {
  AI_ANALYSIS_SYSTEM_NOTICE_JA,
  ANALYSIS_SUPPORT_DISCLAIMER_JA,
  APP_MODE_LIVE_ANALYSIS_LABEL,
  ORDER_EXECUTION_NOTICE_JA,
} from '../../src/constants/platformClarification';

describe('platformClarification', () => {
  it('uses live analysis mode label instead of production trading wording', () => {
    expect(APP_MODE_LIVE_ANALYSIS_LABEL).toBe('実運用分析モード');
    expect(APP_MODE_LIVE_ANALYSIS_LABEL).not.toContain('本番');
    expect(APP_MODE_LIVE_ANALYSIS_LABEL).not.toMatch(/手動売買/);
  });

  it('states analysis-only and external order execution', () => {
    expect(AI_ANALYSIS_SYSTEM_NOTICE_JA).toContain('分析支援');
    expect(ANALYSIS_SUPPORT_DISCLAIMER_JA).toContain('証券会社');
    expect(ORDER_EXECUTION_NOTICE_JA).toContain('証券会社アプリ');
  });
});
