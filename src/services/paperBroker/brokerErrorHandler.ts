import type { BrokerOrder } from '../../types/paperBroker';
import { getBrokerAdapter } from './brokerRegistry';
import { loadPaperBrokerState, savePaperBrokerState } from './paperBrokerStorage';

export async function retryCancelRecover(orderId: string, accountId: string): Promise<{
  ok: boolean;
  messageJa: string;
}> {
  const state = await loadPaperBrokerState();
  const order = state.orders.find((o) => o.id === orderId);
  if (!order) {
    return { ok: false, messageJa: '注文が見つかりません' };
  }
  const broker = getBrokerAdapter(order.brokerId);
  if (order.status === 'pending') {
    const cancel = await broker.cancelOrder(accountId, orderId);
    return cancel.ok
      ? { ok: true, messageJa: 'キャンセル完了（紙上）' }
      : { ok: false, messageJa: cancel.errorJa ?? 'キャンセル失敗' };
  }
  const recovered: BrokerOrder = {
    ...order,
    status: 'rejected',
    rejectReasonJa: '手動リカバリ — 再試行中止',
    updatedAt: new Date().toISOString(),
  };
  await savePaperBrokerState({
    ...state,
    orders: state.orders.map((o) => (o.id === orderId ? recovered : o)),
  });
  return { ok: true, messageJa: '注文を rejected にマーク（紙上リカバリ）' };
}
