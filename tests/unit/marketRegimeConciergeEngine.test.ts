import { describe, expect, it } from 'vitest';
import {
  buildStubGlobalMarketAnalysis,
} from '../../src/services/marketRegimeConciergeEngine';
import { evaluateGlobalMarketProactiveAlerts } from '../../src/services/marketRegimeProactiveAlerts';
import { VIX_SPIKE_THRESHOLD } from '../../src/constants/globalMarket';

describe('marketRegimeConciergeEngine', () => {
  it('stub marks insufficient data', () => {
    const stub = buildStubGlobalMarketAnalysis();
    expect(stub.insufficientData).toBe(true);
    expect(stub.regimeId).toBe('sideways');
  });
});

describe('marketRegimeProactiveAlerts', () => {
  it('emits risk-off regime alert', () => {
    const analysis = buildStubGlobalMarketAnalysis();
    analysis.regimeId = 'risk_off';
    analysis.regimeLabelJa = 'リスクオフ';
    analysis.regimeSummaryJa = 'テスト';
    analysis.regimeConfidencePct = 70;
    const alerts = evaluateGlobalMarketProactiveAlerts(analysis);
    expect(alerts.some((a) => a.titleJa.includes('リスクオフ'))).toBe(true);
    expect(alerts[0]?.notificationWhyJa).toBeTruthy();
  });

  it('emits VIX spike alert', () => {
    const analysis = buildStubGlobalMarketAnalysis();
    analysis.vix = {
      id: 'vix',
      labelJa: 'VIX',
      yahooSymbol: '^VIX',
      value: VIX_SPIKE_THRESHOLD + 3,
      changePct: 5,
      unitJa: 'pt',
      fromLive: true,
    };
    const alerts = evaluateGlobalMarketProactiveAlerts(analysis);
    expect(alerts.some((a) => a.titleJa.includes('VIX'))).toBe(true);
  });
});
