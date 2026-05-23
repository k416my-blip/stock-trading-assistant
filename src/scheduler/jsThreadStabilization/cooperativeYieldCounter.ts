let count = 0;

export function resetCooperativeYieldCounterForTest(): void {
  count = 0;
}

export function noteCooperativeYield(): void {
  count += 1;
}

export function getCooperativeYieldCount(): number {
  return count;
}
