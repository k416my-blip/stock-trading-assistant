/**
 * __DEV__ で React リストの key 重複を Metro ログに出す（実機切り分け用）
 */
export type ReactKeyDuplicateEntry = {
  key: string;
  count: number;
};

export function logDuplicateReactKeys(
  scope: string,
  component: string,
  keys: string[],
): void {
  if (typeof __DEV__ === 'undefined' || !__DEV__) return;

  const counts = new Map<string, number>();
  for (const k of keys) {
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const duplicates: ReactKeyDuplicateEntry[] = [...counts.entries()]
    .filter(([, n]) => n > 1)
    .map(([key, count]) => ({ key, count }));

  if (duplicates.length === 0) return;

  console.warn('[react-key-dup]', {
    scope,
    component,
    duplicateCount: duplicates.length,
    keys: duplicates,
  });
}

export function keyedLine(scope: string, line: string, index: number): string {
  return `${scope}-idx${index}-${line.slice(0, 48)}`;
}

/** リスト描画用 — 値が重複しても index で一意 */
export function listKey(prefix: string, index: number, value?: string): string {
  const tail =
    value != null && value.length > 0
      ? `-${value.slice(0, 32).replace(/\s+/g, '_')}`
      : '';
  return `${prefix}-idx${index}${tail}`;
}
