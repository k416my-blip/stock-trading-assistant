import { describe, expect, it } from 'vitest';
import { isHtmlResponse, responseBodyPreview } from '../../src/utils/httpFetchDiagnostics';

describe('httpFetchDiagnostics', () => {
  it('detects HTML block responses', () => {
    expect(isHtmlResponse('text/html', '<!DOCTYPE html><html>')).toBe(true);
    expect(isHtmlResponse('application/json', '{"chart":{}}')).toBe(false);
  });

  it('truncates body preview to 200 chars', () => {
    const long = 'x'.repeat(300);
    expect(responseBodyPreview(long).length).toBeLessThanOrEqual(201);
  });
});
