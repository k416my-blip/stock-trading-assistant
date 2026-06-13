/**
 * Phase12.5 device UI helpers — foreground guard, portrait lock, name-based search.
 */

export const STOCK_APP_PKG = 'com.assistant.stocktrading';
export const LATIN_IME = 'com.google.android.inputmethod.latin/com.android.inputmethod.latin.LatinIME';
export const SCREENER_TAB_FALLBACK = { cx: 277, cy: 2486 };
export const MALAYSIA_FILTER_FALLBACK = { cx: 486, cy: 1065 };
export const SEARCH_FIELD_FALLBACK = { cx: 484, cy: 828 };
export const MAX_TAB_SCROLL = 4;
export const MAX_STOCK_VERIFY_MS = 150_000;
export const MAX_DETAIL_WAIT_MS = 30_000;
export const MAX_DETAIL_WAIT_MS_EXTENDED = 45_000;
export const MAX_QUERIES_PER_STOCK = 3;
export const FOREGROUND_RELAUNCH_WAIT_MS = 2000;

/** @param {string} text */
export function normalizeMatchText(text) {
  return (text ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9\u3040-\u9fff\u4e00-\u9fff\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[] }} stock */
export function stockSearchQueries(stock) {
  const seen = new Set();
  /** @type {string[]} */
  const out = [];
  const add = (q) => {
    const t = (q ?? '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };
  add(stock.query);
  add(stock.label);
  for (const a of stock.aliases ?? []) add(a);
  return out.slice(0, MAX_QUERIES_PER_STOCK);
}

/** @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[] }} stock */
export function stockSearchInputText(stock) {
  return stockSearchQueries(stock)[0] ?? stock.label;
}

/** @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[], screenerSymbols?: string[], cardNames?: string[], cardMustInclude?: string[], cardExclude?: string[] }} stock */
export function stockMatchTerms(stock) {
  const terms = new Set();
  terms.add(stock.code);
  if (stock.label) terms.add(stock.label);
  for (const sym of stock.screenerSymbols ?? []) {
    if (sym) terms.add(sym);
  }
  for (const name of stock.cardNames ?? []) {
    if (name) terms.add(name);
  }
  for (const q of stockSearchQueries(stock)) terms.add(q);
  for (const p of stock.patterns ?? []) {
    if (p) terms.add(p);
  }
  return [...terms];
}

/** @param {string} label @param {{ code: string, cardMustInclude?: string[], cardExclude?: string[] }} stock */
export function isExcludedCardLabel(label, stock) {
  for (const ex of stock.cardExclude ?? []) {
    if (normalizedIncludes(label, ex)) return true;
  }
  if (stock.cardMustInclude?.length) {
    const codeTicker =
      label.includes(`${stock.code} ·`) ||
      label.includes(` · ${stock.code}`) ||
      (label.includes(stock.code) && label.includes('·'));
    if (!codeTicker) {
      const ok = stock.cardMustInclude.some((t) => normalizedIncludes(label, t));
      if (!ok) return true;
    }
  }
  return false;
}

/** @param {string} haystack @param {string} needle */
export function normalizedIncludes(haystack, needle) {
  const h = normalizeMatchText(haystack);
  const n = normalizeMatchText(needle);
  if (!n || n.length < 2) return false;
  return h.includes(n);
}

/** @param {string} label @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[] }} stock */
export function labelMatchesStock(label, stock) {
  if (!label) return false;
  if (label.includes(stock.code)) return true;
  for (const term of stockMatchTerms(stock)) {
    if (normalizedIncludes(label, term)) return true;
  }
  return false;
}

/** @param {string} label @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[], screenerSymbols?: string[], cardNames?: string[], cardMustInclude?: string[], cardExclude?: string[] }} stock */
export function isStockCardLabel(label, stock) {
  if (!label) return false;
  if (
    label.includes('マレーシア市場') ||
    label.includes('銘柄名') ||
    label.includes('ティッカー') ||
    label === '0件' ||
    label.includes('該当する銘柄') ||
    label.includes('現在株価') ||
    label.includes('総合おすすめ度') ||
    label.includes('この銘柄を候補')
  ) {
    return false;
  }
  if (isExcludedCardLabel(label, stock)) return false;

  for (const sym of [stock.code, ...(stock.screenerSymbols ?? [])]) {
    if (label.includes(`${sym} ·`) || label.includes(` · ${sym}`)) return true;
    if (label.includes(sym) && label.includes('·')) return true;
  }

  for (const name of stock.cardNames ?? []) {
    if (normalizedIncludes(label, name) || normalizedIncludes(name, label)) return true;
  }

  if (label.includes('·')) return labelMatchesStock(label, stock);

  if (
    labelMatchesStock(label, stock) &&
    (/\bBerhad\b|\bBhd\b|\bGroup\b|\bCorporation\b/i.test(label) || (stock.cardNames?.length ?? 0) > 0)
  ) {
    return true;
  }

  return false;
}

/**
 * @param {string} xml
 * @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[] }} stock
 * @param {(xml: string, pred: (l: string) => boolean) => Array<{ label: string, cx: number, cy: number }>} findLabels
 */
export function findStockSearchCards(xml, stock, findLabels) {
  return findLabels(xml, (l) => isStockCardLabel(l, stock));
}

/** @param {{ detailWaitMs?: number }} stock */
export function resolveDetailWaitMs(stock) {
  const ms = stock?.detailWaitMs;
  if (typeof ms === 'number' && ms > 0) return ms;
  return MAX_DETAIL_WAIT_MS;
}

/** @param {string} xml @param {{ detailExclude?: string[] }} stock */
export function isExcludedDetailXml(xml, stock) {
  for (const ex of stock.detailExclude ?? []) {
    if (normalizedIncludes(xml, ex)) return true;
  }
  return false;
}

/** @param {string} xml */
export function isDetailLoading(xml) {
  return (
    xml.includes('取得中') ||
    xml.includes('ProgressBar') ||
    xml.includes('loading') ||
    xml.includes('読み込み')
  );
}

/** @param {string} xml @param {{ code: string, label: string, query?: string, aliases?: string[], patterns?: string[], screenerSymbols?: string[], cardNames?: string[], detailExclude?: string[] }} stock */
export function isStockDetailVisible(xml, stock) {
  if (!xml || isDetailLoading(xml)) return false;
  if (isExcludedDetailXml(xml, stock)) return false;

  const nameOk =
    normalizedIncludes(xml, stock.label) ||
    (stock.cardNames ?? []).some((n) => n.length >= 3 && normalizedIncludes(xml, n)) ||
    (stock.patterns ?? []).some((p) => p && p.length >= 3 && normalizedIncludes(xml, p));

  const codeHits = [stock.code, ...(stock.screenerSymbols ?? [])];
  const codeOk = codeHits.some((sym) => sym && xml.includes(sym));

  if ((stock.cardNames?.length ?? 0) > 0 || (stock.screenerSymbols?.length ?? 0) > 0) {
    if (codeOk && xml.includes(stock.code)) return true;
    if (nameOk) return true;
    if (
      xml.includes('AI四季報') &&
      !xml.includes('AI四季報を取得中') &&
      (xml.includes('会社名') || xml.includes('【四季報'))
    ) {
      for (const term of stockMatchTerms(stock)) {
        if (term.length >= 3 && normalizedIncludes(xml, term)) return true;
      }
    }
    return false;
  }

  if (codeOk) return true;

  for (const p of stock.patterns ?? []) {
    if (p && xml.includes(p)) return true;
  }
  for (const q of stockSearchQueries(stock)) {
    if (q.length >= 4 && normalizedIncludes(xml, q)) return true;
  }
  if (xml.includes('AI四季報') && !xml.includes('AI四季報を取得中')) {
    for (const term of stockMatchTerms(stock)) {
      if (term.length >= 4 && normalizedIncludes(xml, term)) return true;
    }
  }
  if (xml.includes('現在株価') || xml.includes('RM ')) {
    if (codeOk) return true;
    if (normalizedIncludes(xml, stock.label)) return true;
  }
  return false;
}

/** @param {string} xml @param {{ detailExclude?: string[], cardNames?: string[] }} stock */
export function isWrongStockDetail(xml, stock) {
  if (!xml || isDetailLoading(xml)) return false;
  if (isExcludedDetailXml(xml, stock)) return true;
  if (isStockDetailVisible(xml, stock)) return false;
  const onDetail =
    xml.includes('会社名') ||
    (xml.includes('AI四季報') && !xml.includes('銘柄検索') && !xml.includes('Bursa 銘柄発掘'));
  if (!onDetail) return false;
  for (const ex of stock.detailExclude ?? []) {
    if (normalizedIncludes(xml, ex)) return true;
  }
  return true;
}

/** @param {Function} sh */
export function ensurePortrait(sh) {
  sh('adb shell settings put system accelerometer_rotation 0', { allowFail: true });
  sh('adb shell settings put system user_rotation 0', { allowFail: true });
}

export function dumpCurrentFocus(sh) {
  const raw = sh('adb shell dumpsys window', { allowFail: true });
  return {
    at: new Date().toISOString(),
    package: parseForegroundPackage(raw),
    raw: raw.split('\n').find((l) => l.includes('mCurrentFocus'))?.trim() ?? '',
  };
}

/** @param {string} dumpsysText */
export function parseForegroundPackage(dumpsysText) {
  const m = dumpsysText.match(/mCurrentFocus=Window\{[^ ]+ u0 ([^/\s]+)\//);
  return m?.[1] ?? '';
}

/** @param {string} pkg */
export function isStockAppForeground(fg, pkg = STOCK_APP_PKG) {
  return fg === pkg;
}

/** @param {string} fg */
export function isForeignAppForeground(fg, pkg = STOCK_APP_PKG) {
  return Boolean(fg) && fg !== pkg;
}

/**
 * @param {{ sh: Function, pkg?: string, wakeDevice?: () => void, sleep: (ms: number) => Promise<void>, label?: string }} ctx
 */
export async function safeEnsureAppForeground(ctx) {
  const pkg = ctx.pkg ?? STOCK_APP_PKG;
  ensurePortrait(ctx.sh);
  ctx.wakeDevice?.();

  let focus = dumpCurrentFocus(ctx.sh);
  if (!isStockAppForeground(focus.package, pkg)) {
    console.warn(
      `[p12.5] WARN foreground=${focus.package || 'unknown'} expected=${pkg}${ctx.label ? ` (${ctx.label})` : ''}`,
    );
    ctx.sh(`adb shell monkey -p ${pkg} 1`, { allowFail: true });
    ctx.sh(`adb shell am start -n ${pkg}/.MainActivity`, { allowFail: true });
    await ctx.sleep(FOREGROUND_RELAUNCH_WAIT_MS);
    focus = dumpCurrentFocus(ctx.sh);
  }

  if (!isStockAppForeground(focus.package, pkg)) {
    return { ok: false, foreground: focus.package, focus, reason: 'wrong_foreground' };
  }
  return { ok: true, foreground: focus.package, focus };
}

export async function clearSearchField(sh, sleep, times = 16) {
  for (let i = 0; i < times; i++) sh('adb shell input keyevent 67', { allowFail: true });
  await sleep(200);
}

/**
 * @param {{ sh: Function, pkg?: string, text: string, sleep: (ms: number) => Promise<void>, ensureForeground: () => Promise<{ ok: boolean, foreground?: string, reason?: string }> }} ctx
 */
export async function safeInputText(ctx) {
  const pkg = ctx.pkg ?? STOCK_APP_PKG;
  const fg = await ctx.ensureForeground();
  if (!fg.ok) return fg;

  ctx.sh(`adb shell ime set ${LATIN_IME}`, { allowFail: true });
  await ctx.sleep(300);

  const escaped = ctx.text.replace(/ /g, '%s');
  ctx.sh(`adb shell input text ${escaped}`, { allowFail: true });
  await ctx.sleep(400);

  const after = dumpCurrentFocus(ctx.sh);
  if (!isStockAppForeground(after.package, pkg)) {
    return {
      ok: false,
      foreground: after.package,
      focus: after,
      reason: 'foreground_lost_after_input',
    };
  }
  return { ok: true, foreground: after.package, focus: after };
}

/**
 * @param {string} xml
 * @param {(xml: string, pred: (l: string) => boolean) => Array<{ label: string, cx: number, cy: number }>} findLabels
 */
export function findMalaysiaMarketFilter(xml, findLabels) {
  return findLabels(xml, (l) => l === 'マレーシア市場')[0] ?? null;
}

/** @param {string} xml */
export function screenerSearchFieldCenter(xml) {
  const m = xml.match(/resource-id="screener-search-input"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  if (!m) return SEARCH_FIELD_FALLBACK;
  return {
    cx: Math.floor((+m[1] + +m[3]) / 2),
    cy: Math.floor((+m[2] + +m[4]) / 2),
  };
}

/** @param {{ code: string, label: string, query?: string, aliases?: string[], screenerSymbols?: string[] }} stock @param {Array<{ label: string, cx: number, cy: number }>} cards */
export function pickStockCardTapTargets(stock, cards) {
  /** @type {Array<{ label: string, cx: number, cy: number }>} */
  const out = [];
  const seen = new Set();
  const add = (c) => {
    const key = `${c.cx},${c.cy},${c.label}`;
    if (seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  const symbols = [stock.code, ...(stock.screenerSymbols ?? [])];
  for (const sym of symbols) {
    for (const c of cards) {
      if (c.label.includes('·') && c.label.includes(sym)) add(c);
    }
  }
  for (const sym of symbols) {
    for (const c of cards) {
      if (c.label.includes(sym)) add(c);
    }
  }
  for (const c of cards) {
    if (!c.label.includes('·') && labelMatchesStock(c.label, stock)) add(c);
  }
  for (const c of cards) {
    if (c.label.includes('·')) add(c);
  }
  return out;
}

/** @param {{ code: string, label: string, query?: string, aliases?: string[], screenerSymbols?: string[] }} stock @param {Array<{ label: string, cx: number, cy: number }>} cards */
export function pickBestStockCard(stock, cards) {
  return pickStockCardTapTargets(stock, cards)[0] ?? null;
}
