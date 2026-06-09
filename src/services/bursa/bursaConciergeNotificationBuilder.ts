/**
 * Bursa Phase 10 — AIコンシェルジュ通知生成
 */
import type {
  BursaConciergeNotification,
  BursaNotificationCategory,
  BursaNotificationTriggerKind,
  BursaPhase6Analysis,
  BursaPhase7Analysis,
  BursaPhase8Analysis,
  BursaPhase9Analysis,
  BursaTodayAction,
} from '../../types/bursaDisclosure';

const MISSING = 'データ未取得';

const IMPORTANCE: Record<BursaNotificationTriggerKind, 1 | 2 | 3 | 4 | 5> = {
  強気買い: 5,
  売却候補: 5,
  利益急減: 5,
  順位急落: 5,
  買い: 4,
  減配: 4,
  注意: 3,
  増配: 3,
  利益急増: 3,
  順位急上昇: 3,
};

const CATEGORY: Record<BursaNotificationTriggerKind, BursaNotificationCategory> = {
  強気買い: '買い',
  買い: '買い',
  注意: '売り',
  売却候補: '売り',
  増配: '配当',
  減配: '配当',
  利益急増: '決算',
  利益急減: '決算',
  順位急上昇: '監視',
  順位急落: '監視',
};

function shortName(name: string | null, code: string): string {
  if (!name) return code;
  const first = name.split(/\s+/)[0] ?? name;
  return first.length > 20 ? first.slice(0, 20) : first;
}

function makeId(at: string, code: string | null, kind: string, seq: number): string {
  return `${at}-${code ?? 'market'}-${kind}-${seq}`;
}

function pushNotification(
  out: BursaConciergeNotification[],
  input: {
    at: string;
    seq: number;
    stockCode: string | null;
    companyName: string | null;
    triggerKind: BursaNotificationTriggerKind;
    titleJa: string;
    messageJa: string;
    reasons: string[];
    isHolding: boolean;
  },
): number {
  const importance = IMPORTANCE[input.triggerKind];
  out.push({
    id: makeId(input.at, input.stockCode, input.triggerKind, input.seq),
    createdAt: input.at,
    stockCode: input.stockCode,
    companyName: input.companyName,
    category: CATEGORY[input.triggerKind],
    importance,
    triggerKind: input.triggerKind,
    titleJa: input.titleJa,
    messageJa: input.messageJa,
    reasons: input.reasons,
    isHolding: input.isHolding,
    isRead: false,
  });
  return input.seq + 1;
}

export function buildConciergeNotifications(input: {
  phase7: BursaPhase7Analysis;
  phase8: BursaPhase8Analysis;
  phase9: BursaPhase9Analysis;
  at: string;
}): BursaConciergeNotification[] {
  const out: BursaConciergeNotification[] = [];
  let seq = 0;
  const seen = new Set<string>();

  const add = (
    key: string,
    payload: Parameters<typeof pushNotification>[1],
  ) => {
    if (seen.has(key)) return;
    seen.add(key);
    seq = pushNotification(out, payload);
  };

  for (const d of input.phase7.holdingsDiagnosis) {
    const kind = d.judgment;
    if (
      kind !== '強気買い' &&
      kind !== '買い' &&
      kind !== '注意' &&
      kind !== '売却候補'
    ) {
      continue;
    }
    const triggerKind = kind as BursaNotificationTriggerKind;
    const label = shortName(d.companyName, d.symbol);
    add(`${d.symbol}-${triggerKind}`, {
      at: input.at,
      seq,
      stockCode: d.symbol,
      companyName: d.companyName,
      triggerKind,
      titleJa: `${label} — ${triggerKind}`,
      messageJa: d.reasons.join(' · ') || MISSING,
      reasons: d.reasons,
      isHolding: true,
    });
  }

  for (const s of input.phase8.sellCandidates) {
    const triggerKind: BursaNotificationTriggerKind =
      s.kind === '利益確定' ? '売却候補' : s.kind === '損切り' ? '売却候補' : '売却候補';
    const label = shortName(s.companyName, s.symbol);
    add(`${s.symbol}-sell-${s.kind}`, {
      at: input.at,
      seq,
      stockCode: s.symbol,
      companyName: s.companyName,
      triggerKind,
      titleJa: `${label} — ${s.kind}`,
      messageJa: s.reasonJa,
      reasons: [s.reasonJa],
      isHolding: true,
    });
  }

  for (const a of input.phase9.alerts) {
    const triggerKind = a.kind as BursaNotificationTriggerKind;
    add(`${a.stockCode}-${triggerKind}-${a.id}`, {
      at: input.at,
      seq,
      stockCode: a.stockCode,
      companyName: a.companyName,
      triggerKind,
      titleJa: `${shortName(a.companyName, a.stockCode)} — ${triggerKind}`,
      messageJa: a.messageJa,
      reasons: [a.messageJa],
      isHolding: a.isHolding,
    });
  }

  for (const b of input.phase8.buyTop10.slice(0, 5)) {
    if (b.judgment !== '強気買い' && b.judgment !== '買い') continue;
    const triggerKind = b.judgment as BursaNotificationTriggerKind;
    add(`${b.stockCode}-buytop`, {
      at: input.at,
      seq,
      stockCode: b.stockCode,
      companyName: b.companyName,
      triggerKind,
      titleJa: `${shortName(b.companyName, b.stockCode)} — ${triggerKind}`,
      messageJa: b.reasonJa,
      reasons: [b.reasonJa],
      isHolding: false,
    });
  }

  return sortNotifications(out);
}

export function sortNotifications(
  items: BursaConciergeNotification[],
): BursaConciergeNotification[] {
  return [...items].sort((a, b) => {
    if (a.isHolding !== b.isHolding) return a.isHolding ? -1 : 1;
    if (b.importance !== a.importance) return b.importance - a.importance;
    return Date.parse(b.createdAt) - Date.parse(a.createdAt);
  });
}

export function buildTodayAction(input: {
  notifications: BursaConciergeNotification[];
  phase6: BursaPhase6Analysis;
  phase7: BursaPhase7Analysis;
  phase8: BursaPhase8Analysis;
  phase9: BursaPhase9Analysis;
}): BursaTodayAction {
  const holding = input.notifications.filter((n) => n.isHolding);

  const sell = holding.find(
    (n) =>
      n.triggerKind === '売却候補' ||
      n.triggerKind === '減配' ||
      n.triggerKind === '利益急減' ||
      n.triggerKind === '順位急落',
  );
  if (sell) {
    return {
      actionJa: `本日の最重要行動: ${sell.titleJa}`,
      symbol: sell.stockCode,
      reasons: sell.reasons.length > 0 ? sell.reasons : [sell.messageJa],
    };
  }

  for (const d of input.phase7.holdingsDiagnosis) {
    if (d.judgment !== '強気買い' && d.judgment !== '買い') continue;
    const label = shortName(d.companyName, d.symbol);
    const add = input.phase7.addPosition.find((a) => a.symbol === d.symbol);
    const rank = input.phase6.rankedTop100.find((r) => r.stockCode === d.symbol);
    const div = input.phase9.dividendChanges.find((x) => x.stockCode === d.symbol);
    const reasons: string[] = [];
    if (add?.reasonJa && add.reasonJa !== MISSING) reasons.push(add.reasonJa);
    if (div?.status === '増配') reasons.push('増配');
    if (rank?.rank != null) reasons.push(`ランキング${rank.rank}位`);
    if (reasons.length === 0 && d.reasons.length > 0) reasons.push(...d.reasons.slice(0, 3));
    const verb = add?.verdict === '買い増し' ? '買い増し' : '買い検討';
    return {
      actionJa: `本日の最重要行動: ${label}${verb}`,
      symbol: d.symbol,
      reasons,
    };
  }

  if (input.phase8.primaryAction.actionJa) {
    return {
      actionJa: `本日の最重要行動: ${input.phase8.primaryAction.actionJa}`,
      symbol: input.phase8.primaryAction.symbol,
      reasons: [input.phase8.primaryAction.reasonJa],
    };
  }

  return {
    actionJa: '本日の最重要行動: データ未取得',
    symbol: null,
    reasons: [MISSING],
  };
}

export function importanceStars(importance: number): string {
  const n = Math.max(1, Math.min(5, importance));
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
