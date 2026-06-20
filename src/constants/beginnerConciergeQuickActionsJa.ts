export type BeginnerConciergeQuickAction = {
  id: string;
  label: string;
  seed: string;
};

export const BEGINNER_CONCIERGE_QUICK_ACTIONS: readonly BeginnerConciergeQuickAction[] = [
  { id: 'today', label: '今日どうする？', seed: '今日は何か売買すべきですか？' },
  { id: 'holdings', label: '保有銘柄は？', seed: '今の保有銘柄の方針を教えてください' },
  { id: 'buy_timing', label: '買い時？', seed: '今、新しく株を買うべきタイミングですか？' },
  { id: 'sell', label: '売るべき？', seed: '保有銘柄を売るべきですか？' },
  { id: 'urgency', label: '急ぐ必要ある？', seed: '急いで行動する必要はありますか？' },
  { id: 'order_log', label: '注文の記録', seed: '注文の記録方法を教えてください' },
] as const;
