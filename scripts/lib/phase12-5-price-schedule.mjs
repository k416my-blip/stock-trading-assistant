/**
 * Phase12.5 price refresh scheduling — slot-based tags decoupled from elapsed wall clock.
 */

export const PRICE_SLOT_MINUTES = [0, 15, 30, 45];

export function priceRefreshTag(hourIndex, minuteIndex) {
  return `h${hourIndex}-m${minuteIndex}`;
}

export function initialPriceSlot() {
  return { hourIndex: 0, minuteIndex: 0 };
}

export function advancePriceSlot(hourIndex, minuteIndex) {
  const idx = PRICE_SLOT_MINUTES.indexOf(minuteIndex);
  if (idx < 0) {
    throw new Error(`invalid price minuteIndex: ${minuteIndex}`);
  }
  if (idx < PRICE_SLOT_MINUTES.length - 1) {
    return { hourIndex, minuteIndex: PRICE_SLOT_MINUTES[idx + 1] };
  }
  return { hourIndex: hourIndex + 1, minuteIndex: 0 };
}

export function isPriceRefreshDue(nowMs, lastPriceMs, priceIntervalMs) {
  return nowMs - lastPriceMs >= priceIntervalMs;
}

/**
 * Legacy elapsed-based minute index (buggy near hour boundaries).
 * Kept for regression comparison in tests.
 */
export function legacyMinuteIndexFromElapsed(elapsedMs, hourMs) {
  return Math.floor((elapsedMs % hourMs) / (15 * 60 * 1000)) * 15;
}

/**
 * Simulate scheduled vs legacy tagging across a timeline.
 * Returns tags that would be emitted by each strategy.
 */
export function simulatePriceTags({
  events,
  hourMs = 3600_000,
  priceIntervalMs = 15 * 60_000,
}) {
  let next = initialPriceSlot();
  let lastPriceMs = events[0]?.atMs ?? 0;
  const scheduled = [];
  const legacy = [];

  for (const event of events) {
    if (event.type === 'bootstrap') {
      scheduled.push(priceRefreshTag(next.hourIndex, next.minuteIndex));
      legacy.push(priceRefreshTag(0, 0));
      next = advancePriceSlot(next.hourIndex, next.minuteIndex);
      lastPriceMs = event.atMs;
      continue;
    }
    if (event.type === 'tick' && event.atMs - lastPriceMs >= priceIntervalMs) {
      const hourIndex = Math.floor((event.atMs - (events[0]?.startMs ?? 0)) / hourMs);
      const elapsed = event.atMs - (events[0]?.startMs ?? 0);
      scheduled.push(priceRefreshTag(next.hourIndex, next.minuteIndex));
      legacy.push(priceRefreshTag(hourIndex, legacyMinuteIndexFromElapsed(elapsed, hourMs)));
      next = advancePriceSlot(next.hourIndex, next.minuteIndex);
      lastPriceMs = event.atMs;
    }
  }

  return { scheduled, legacy };
}
