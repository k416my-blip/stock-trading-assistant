import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants/storageKeys';
import type { TradeQueueAckStatus } from '../types/urgencySignal';

export type TradeQueueAckRecord = {
  itemId: string;
  status: TradeQueueAckStatus;
  updatedAt: string;
};

export type UrgencySignalAuditEntry = {
  signalId: string;
  action: 'acknowledged' | 'expired' | 'disabled';
  at: string;
  note?: string;
};

type AckStore = {
  items: Record<string, TradeQueueAckRecord>;
  system: Record<string, TradeQueueAckRecord>;
  audit: UrgencySignalAuditEntry[];
};

const EMPTY: AckStore = { items: {}, system: {}, audit: [] };

async function loadStore(): Promise<AckStore> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.tradeQueueAck);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<AckStore>;
    return {
      items: parsed.items ?? {},
      system: parsed.system ?? {},
      audit: Array.isArray(parsed.audit) ? parsed.audit : [],
    };
  } catch {
    return { ...EMPTY };
  }
}

async function saveStore(store: AckStore): Promise<void> {
  const audit = store.audit.slice(-200);
  await AsyncStorage.setItem(
    STORAGE_KEYS.tradeQueueAck,
    JSON.stringify({ ...store, audit }),
  );
}

export async function loadTradeQueueAckMap(): Promise<Record<string, TradeQueueAckRecord>> {
  const store = await loadStore();
  return store.items;
}

export function resolveTradeQueueAckStatus(
  itemId: string,
  map: Record<string, TradeQueueAckRecord>,
): TradeQueueAckStatus {
  return map[itemId]?.status ?? 'unacknowledged';
}

export async function acknowledgeTradeQueueItem(itemId: string): Promise<TradeQueueAckRecord> {
  const store = await loadStore();
  const record: TradeQueueAckRecord = {
    itemId,
    status: 'acknowledged',
    updatedAt: new Date().toISOString(),
  };
  store.items[itemId] = record;
  store.audit.push({
    signalId: itemId,
    action: 'acknowledged',
    at: record.updatedAt,
    note: 'trade_queue',
  });
  await saveStore(store);
  return record;
}

export async function acknowledgeSystemSignal(signalId: string): Promise<void> {
  const store = await loadStore();
  const updatedAt = new Date().toISOString();
  store.system[signalId] = { itemId: signalId, status: 'acknowledged', updatedAt };
  store.audit.push({
    signalId,
    action: 'acknowledged',
    at: updatedAt,
    note: 'system',
  });
  await saveStore(store);
}

export async function loadSystemAckMap(): Promise<Record<string, TradeQueueAckRecord>> {
  const store = await loadStore();
  return store.system;
}

export async function loadUrgencySignalAuditLog(): Promise<UrgencySignalAuditEntry[]> {
  const store = await loadStore();
  return store.audit;
}

export async function clearTradeQueueAckForTest(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.tradeQueueAck);
}
