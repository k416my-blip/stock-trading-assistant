import { describe, expect, it } from 'vitest';
import {
  buildXAuthorizationHeader,
  normalizeBearerToken,
  validateAuthorizationHeaderFormat,
} from '../../src/services/xBearerToken';
import {
  classifyXHttpStatus,
  xHttpStatusDiagnosisJa,
  xHttpStatusUserMessageJa,
} from '../../src/services/xHttpStatus';
import { X_HTTP_402_USER_MESSAGE_JA } from '../../src/constants/xApiOptional';
import {
  extractSymbolsForXLookup,
  userMessageRequestsXInsight,
} from '../../src/services/xApiIntent';
import { buildXApiUsageDashboard } from '../../src/services/xApiUsageStorage';
import type { XApiDailyUsage } from '../../src/types/xApi';

describe('xApiIntent', () => {
  it('detects X/SNS related questions', () => {
    expect(userMessageRequestsXInsight('Xで1155の話題は？')).toBe(true);
    expect(userMessageRequestsXInsight('ポートフォリオのリスクは？')).toBe(false);
  });

  it('extracts Bursa symbols from message', () => {
    const found = extractSymbolsForXLookup('1155のSNSセンチメント', []);
    expect(found.some((f) => f.symbol === '1155')).toBe(true);
  });

  it('falls back to single holding when no symbol in message', () => {
    const found = extractSymbolsForXLookup('ツイッターで話題？', [
      { symbol: '1155', market: 'bursa' },
    ]);
    expect(found).toHaveLength(1);
    expect(found[0].symbol).toBe('1155');
  });
});

describe('xBearerToken', () => {
  it('strips newlines and Bearer prefix', () => {
    expect(normalizeBearerToken('Bearer\nAAA\nBBB')).toBe('AAABBB');
  });

  it('builds Authorization with single space after Bearer', () => {
    const h = buildXAuthorizationHeader('mytoken');
    expect(h.Authorization).toBe('Bearer mytoken');
    expect(h.Authorization.startsWith('Bearer ')).toBe(true);
    expect(validateAuthorizationHeaderFormat(h.Authorization).valid).toBe(true);
  });

  it('maps HTTP status to Japanese diagnosis', () => {
    expect(xHttpStatusUserMessageJa(401)).toBe('認証失敗');
    expect(xHttpStatusUserMessageJa(402)).toBe(X_HTTP_402_USER_MESSAGE_JA);
    expect(xHttpStatusUserMessageJa(403)).toBe('権限不足');
    expect(xHttpStatusUserMessageJa(429)).toBe('Rate limit');
    expect(classifyXHttpStatus(402)).toBe('payment_required');
    expect(xHttpStatusDiagnosisJa(402)).toContain('402');
  });
});

describe('xApiUsageStorage dashboard', () => {
  it('builds forecast with remaining credits', () => {
    const usage: XApiDailyUsage = {
      version: 1,
      dateKey: '2026-05-20',
      searchCalls: 3,
      verifyCalls: 1,
      creditsUsed: 4,
      lastUpdatedAt: '2026-05-20T10:00:00.000Z',
    };
    const dash = buildXApiUsageDashboard(usage);
    expect(dash.creditsUsed).toBe(4);
    expect(dash.remainingToday).toBeGreaterThanOrEqual(0);
    expect(dash.forecastJa).toContain('本日 4 クレジット');
    expect(dash.conservationEnabled).toBe(true);
  });
});
