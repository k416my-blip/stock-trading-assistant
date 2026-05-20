import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearDiagnosticEvents,
  exportDiagnosticsReport,
  exportDiagnosticsReportJson,
  recordDiagnosticEvent,
} from '../../src/services/structuredDiagnostics';

describe('structuredDiagnostics', () => {
  beforeEach(() => clearDiagnosticEvents());

  it('records and exports events', () => {
    recordDiagnosticEvent({
      type: 'boot',
      severity: 'info',
      module: 'AppContext',
      message: 'Boot complete',
    });
    const report = exportDiagnosticsReport();
    expect(report.eventCount).toBe(1);
    expect(report.events[0].module).toBe('AppContext');
  });

  it('redacts secrets in export json', () => {
    recordDiagnosticEvent({
      type: 'api',
      severity: 'warning',
      module: 'marketData',
      message: 'apikey=sk_live_abcdefghijklmnop',
    });
    const json = exportDiagnosticsReportJson();
    expect(json).not.toContain('sk_live_abcdefghijklmnop');
  });
});
