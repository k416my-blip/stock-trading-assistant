import { BROKER_LABELS_JA } from '../../constants/paperBroker';
import type { BrokerAdapter, BrokerId } from '../../types/paperBroker';
import { createMockBrokerAdapter } from './mockBrokerAdapter';

const adapters: Record<BrokerId, BrokerAdapter> = {
  mock_paper: createMockBrokerAdapter('mock_paper', BROKER_LABELS_JA.mock_paper),
  ibkr: createMockBrokerAdapter('ibkr', BROKER_LABELS_JA.ibkr),
  alpaca: createMockBrokerAdapter('alpaca', BROKER_LABELS_JA.alpaca),
  rakuten: createMockBrokerAdapter('rakuten', BROKER_LABELS_JA.rakuten),
  bursa: createMockBrokerAdapter('bursa', BROKER_LABELS_JA.bursa),
};

export function getBrokerAdapter(id: BrokerId): BrokerAdapter {
  return adapters[id] ?? adapters.mock_paper;
}

export function listBrokerAdapters(): BrokerAdapter[] {
  return Object.values(adapters);
}

/** 実APIへ送信しないことを保証 */
export function assertBrokerMockOnly(adapter: BrokerAdapter): void {
  if (!adapter.mockMode) {
    throw new Error('Real broker API disabled by safety policy');
  }
}
