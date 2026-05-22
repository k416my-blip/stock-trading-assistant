import { describe, expect, it, beforeEach } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { defaultPaperBrokerState, loadPaperBrokerState, savePaperBrokerState } from '../../src/services/paperBroker/paperBrokerStorage';
import { getBrokerAdapter } from '../../src/services/paperBroker/brokerRegistry';

describe('paper broker execution simulation', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    await savePaperBrokerState(defaultPaperBrokerState());
  });

  it('submits paper buy without real API', async () => {
    const broker = getBrokerAdapter('mock_paper');
    const result = await broker.submitOrder('paper-primary', {
      symbol: '1155',
      market: 'bursa',
      side: 'buy',
      quantity: 50,
      referencePrice: 9.5,
      humanConfirmed: true,
      aiConfidencePct: 70,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.order.status).toMatch(/filled|partial/);
      expect(result.simulationNoteJa).toContain('紙上');
    }
    const state = await loadPaperBrokerState();
    expect(state.config.realTradingEnabled).toBe(false);
    expect(state.orders.length).toBeGreaterThan(0);
  });

  it('rejects without human confirmation when required', async () => {
    const broker = getBrokerAdapter('alpaca');
    const result = await broker.submitOrder('paper-primary', {
      symbol: 'AAPL',
      market: 'us',
      side: 'buy',
      quantity: 1,
      referencePrice: 180,
      humanConfirmed: false,
      aiConfidencePct: 80,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.blocked).toBe(true);
  });
});
