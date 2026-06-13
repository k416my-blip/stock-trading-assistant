/**
 * Phase12.5 Long Run Validation — 実時間12時間 実機連続稼働
 *
 * Usage:
 *   node scripts/phase12-5-long-run.mjs
 *   PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs
 *
 * 短縮検証 (スクリプト動作確認):
 *   PHASE12_5_HOURS=0.25 node scripts/phase12-5-long-run.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import {
  DEFAULT_LIVE_LOGCAT,
  finalizeLogcatSnapshot,
  parseLogcatMetrics,
} from './lib/phase12-5-logcat-finalization.mjs';
import { saveUiDumpSnapshot } from './lib/phase12-5-ui-dump-finalization.mjs';
import { checkMetroListening } from './lib/phase12-5-metro-watchdog.mjs';
import { runInvalidDetectorPass } from './lib/phase12-5-invalid-detectors.mjs';
import { writeInvalidReasonArtifacts } from './lib/phase12-5-graceful-invalid.mjs';
import { resolvePhase125RuntimeMode } from './lib/phase12-5-runtime-mode.mjs';
import {
  clearSearchField,
  dumpCurrentFocus,
  ensurePortrait,
  findMalaysiaMarketFilter,
  findStockSearchCards,
  isDetailLoading,
  isForeignAppForeground,
  isStockDetailVisible,
  MAX_STOCK_VERIFY_MS,
  MAX_TAB_SCROLL,
  MALAYSIA_FILTER_FALLBACK,
  pickBestStockCard,
  pickStockCardTapTargets,
  isWrongStockDetail,
  resolveDetailWaitMs,
  safeEnsureAppForeground,
  safeInputText,
  SCREENER_TAB_FALLBACK,
  screenerSearchFieldCenter,
  stockSearchInputText,
  stockSearchQueries,
} from './lib/phase12-5-device-ui.mjs';

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, 'docs/review/phase12-5-long-run');
const TWELVE_HOUR_LOG_DIR = path.join(ROOT, 'docs/review/twelve-hour-test');
const LIVE_LOGCAT_PATH = path.join(ROOT, DEFAULT_LIVE_LOGCAT);
const PRE_RUN_WATCH_PATH = path.join(TWELVE_HOUR_LOG_DIR, 'pre-run-watch.log');
const REPORT_PATH = path.join(ROOT, 'docs/review/PHASE12_5_LONG_RUN_REPORT.md');
const TELEMETRY_PATH = path.join(OUT_DIR, 'telemetry.jsonl');
const CHECKPOINT_PATH = path.join(OUT_DIR, 'checkpoint.json');
const PKG = 'com.assistant.stocktrading';

const HOURS = Number(process.env.PHASE12_5_HOURS ?? '12');
const DURATION_MS = HOURS * 3600 * 1000;
const HOUR_MS = 3600 * 1000;
const PRICE_INTERVAL_MS = 15 * 60 * 1000;
const TICK_MS = 60 * 1000;

const STOCKS = [
  {
    code: '1155',
    label: 'Maybank',
    query: 'Maybank',
    aliases: ['Malayan Banking', 'MAYBANK'],
    patterns: ['1155', 'Maybank', 'マレー'],
  },
  {
    code: '1023',
    label: 'CIMB',
    query: 'CIMB',
    aliases: ['CIMB Group'],
    patterns: ['1023', 'CIMB'],
  },
  {
    code: '1295',
    label: 'Public Bank',
    query: 'Public Bank',
    aliases: ['Public', 'PBBANK'],
    patterns: ['1295', 'Public', 'パブリック', 'PBBANK'],
    screenerSymbols: ['5225'],
    cardNames: ['Public Bank Berhad'],
    detailExclude: ['IHH', 'Healthcare'],
  },
  {
    code: '5347',
    label: 'Tenaga',
    query: 'Tenaga',
    aliases: ['Tenaga Nasional', 'TNB'],
    patterns: ['5347', 'Tenaga', 'テナガ', 'TNB'],
  },
  {
    code: '4707',
    label: 'Nestle',
    query: 'Nestle',
    aliases: ['(Malaysia)', 'Nestlé (Malaysia)'],
    patterns: ['4707', 'Nestle', 'ネスレ', 'Nestlé'],
    cardNames: ['Nestlé (Malaysia) Berhad'],
  },
  {
    code: '6033',
    label: 'Petronas Gas',
    query: 'Petronas Gas',
    aliases: ['PETGAS', 'Petronas'],
    patterns: ['6033', 'Petronas Gas', 'PETGAS', 'Petronas', 'ペトロナス'],
    cardNames: ['Petronas Gas Berhad', 'PETRONAS GAS', 'PETRONAS GAS BERHAD'],
    cardMustInclude: ['Gas'],
    cardExclude: ['Chemicals', 'Dagangan', 'IHH', 'Healthcare', '5183'],
    detailExclude: ['Petronas Chemicals', '5183', 'Chemicals', 'Dagangan', 'IHH', 'Healthcare'],
    detailWaitMs: 45_000,
  },
];

const state = {
  startedAt: null,
  endedAt: null,
  baselineMemKb: null,
  hourlyMemKb: [],
  cpuSamples: [],
  storageSamples: [],
  priceRefreshRuns: [],
  aiAnalysisRuns: [],
  stockChecks: [],
  crashes: { fatal: 0, rnTypeError: 0, undefined: 0 },
  anrCount: 0,
  logcatBaselineSize: 0,
  pidLostEvents: 0,
  pidChangedEvents: 0,
  baselineAppPid: null,
  logcatScanOffset: 0,
  metroDownAt: null,
  metroPid: null,
  lastMetroCheck: null,
  metroCheckDetails: null,
  bundleErrorAt: null,
  bundleMatchingLine: null,
  bundleSourceFile: null,
  watchDeadAt: null,
  previousPid: null,
  currentPid: null,
  detectorErrors: [],
  runnerStartedMs: null,
  logFinalizationWarnings: [],
  logcatSnapshotPaths: [],
  uiDumpWarnings: [],
  uiDumpPaths: [],
  stopReason: null,
  runtimeMode: resolvePhase125RuntimeMode(),
  bundleWarnCount: 0,
};

function sh(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 30 * 1024 * 1024,
      ...opts,
    }).trim();
  } catch (e) {
    if (opts.allowFail) {
      return `${e.stdout?.toString?.() ?? ''}${e.stderr?.toString?.() ?? ''}`.trim();
    }
    throw e;
  }
}

function adbOk() {
  const out = sh('adb devices', { allowFail: true });
  return out.split('\n').some((l) => l.includes('\tdevice'));
}

function appendTelemetry(entry) {
  fs.appendFileSync(TELEMETRY_PATH, `${JSON.stringify(entry)}\n`, 'utf8');
}

function saveCheckpoint() {
  fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }, null, 2));
}

function wakeDevice() {
  sh('adb shell input keyevent KEYCODE_WAKEUP', { allowFail: true });
  sh('adb shell wm dismiss-keyguard', { allowFail: true });
}

function parseMeminfoKb(text) {
  const m = text.match(/TOTAL\s+(\d+)/);
  return m ? Number(m[1]) : null;
}

function sampleMemory(label) {
  const raw = sh(`adb shell dumpsys meminfo ${PKG}`, { allowFail: true });
  const kb = parseMeminfoKb(raw);
  const file = path.join(OUT_DIR, `meminfo-${label}.txt`);
  fs.writeFileSync(file, raw);
  return { kb, file, at: new Date().toISOString() };
}

function sampleCpu() {
  const raw = sh(`adb shell "top -n 1 -d 1 -b | grep ${PKG}"`, { allowFail: true });
  const m = raw.match(/\s(\d+(?:\.\d+)?)\s+\d/);
  const percent = m ? Number(m[1]) : null;
  return { percent, raw, at: new Date().toISOString() };
}

function sampleAsyncStorageKb() {
  const raw = sh(`adb shell run-as ${PKG} du -sk databases/RKStorage .`, { allowFail: true });
  const lines = raw.split('\n').filter(Boolean);
  let rkKb = null;
  let totalKb = null;
  for (const line of lines) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const kb = Number(parts[0]);
    if (Number.isNaN(kb)) continue;
    if (line.includes('RKStorage') && !line.includes('journal')) rkKb = kb;
    if (line.endsWith(' .') || line.endsWith('\t.')) totalKb = kb;
  }
  if (totalKb == null && lines.length) {
    const p = lines[lines.length - 1].trim().split(/\s+/);
    totalKb = Number(p[0]) || null;
  }
  return { rkKb, totalKb, raw, at: new Date().toISOString() };
}

function recordUiDumpWarning(warning) {
  if (!warning) return;
  state.uiDumpWarnings.push(warning);
  console.warn('[p12.5] WARN ui dump:', warning.message ?? warning);
}

function dumpUi(name) {
  sh('adb shell uiautomator dump /sdcard/p125-ui.xml', { allowFail: true });
  const raw = sh('adb shell cat /sdcard/p125-ui.xml', { allowFail: true });
  const result = saveUiDumpSnapshot({
    outDir: OUT_DIR,
    label: name,
    content: raw,
    mockFail: process.env.PHASE12_5_UI_DUMP_MOCK_FAIL === '1',
  });
  if (result.path) state.uiDumpPaths.push(result.path);
  if (result.warning) recordUiDumpWarning(result.warning);
  return result.content ?? raw ?? '';
}

function findLabels(xml, pred) {
  const re = /(?:text|content-desc)="([^"]*)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g;
  const out = [];
  let m;
  while ((m = re.exec(xml))) {
    const cx = Math.floor((+m[2] + +m[4]) / 2);
    const cy = Math.floor((+m[3] + +m[5]) / 2);
    if (pred(m[1])) out.push({ label: m[1], cx, cy });
  }
  return out;
}

function tap(item) {
  sh(`adb shell input tap ${item.cx} ${item.cy}`, { allowFail: true });
}

async function guardedTap(item, label) {
  const fg = await requireStockForeground(`tap-${label}`);
  if (!fg.ok) return fg;
  tap(item);
  return { ok: true, foreground: fg.foreground };
}

function adbForegroundCtx(label = '') {
  return {
    sh,
    pkg: PKG,
    wakeDevice,
    sleep,
    label,
  };
}

async function requireStockForeground(label) {
  const fg = await safeEnsureAppForeground(adbForegroundCtx(label));
  if (!fg.ok) {
    console.warn(`[p12.5] FAIL foreground guard: ${fg.reason} pkg=${fg.foreground}`);
    appendTelemetry({ type: 'foreground_guard_fail', label, ...fg, at: new Date().toISOString() });
    return fg;
  }
  return fg;
}

async function tapTab(label) {
  await requireStockForeground(`tapTab-${label}`);
  let xml = dumpUi(`tab-pre-${label}`);
  for (let i = 0; i < MAX_TAB_SCROLL; i++) {
    const tabs = findLabels(xml, (l) => l === label || l.endsWith(label) || l.includes(`, ${label}`));
    if (tabs.length) {
      tap(tabs.sort((a, b) => a.cx - b.cx)[0]);
      await sleep(4000);
      return true;
    }
    sh('adb shell input swipe 900 2620 300 2620 350', { allowFail: true });
    await sleep(600);
    xml = dumpUi(`tab-scroll-${label}-${i}`);
  }
  const fallback =
    label === '銘柄検索'
      ? SCREENER_TAB_FALLBACK
      : label === '保有銘柄'
        ? { cx: 388, cy: 2486 }
        : null;
  if (fallback) {
    sh(`adb shell input tap ${fallback.cx} ${fallback.cy}`, { allowFail: true });
    await sleep(4000);
    return true;
  }
  return false;
}

async function dismissOverlayDialogs(tag = 'overlay') {
  const labels = ['了解', 'スキップ', '閉じる', 'OK', '後で'];
  for (let round = 0; round < 3; round++) {
    const check = await requireStockForeground(`dismiss-${tag}-${round}`);
    if (!check.ok) return false;
    const xml = dumpUi(`dismiss-${tag}-${round}`);
    let tapped = false;
    for (const label of labels) {
      const btn = findLabels(xml, (l) => l === label);
      if (btn[0]) {
        tap(btn[0]);
        await sleep(1000);
        tapped = true;
        break;
      }
    }
    if (!tapped) break;
  }
  return true;
}

async function ensureAppForeground() {
  ensurePortrait(sh);
  const fg = await requireStockForeground('ensureAppForeground');
  if (!fg.ok) return false;
  await dismissOverlayDialogs('ensure');
  const pid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim();
  return Boolean(pid);
}

async function openScreenerMalaysia() {
  await requireStockForeground('openScreenerMalaysia');
  await dismissOverlayDialogs('screener-open');
  await tapTab('銘柄検索');
  await sleep(1500);
  await dismissOverlayDialogs('screener-post-tab');
  return ensureMalaysiaFilterActive('open');
}

async function ensureMalaysiaFilterActive(tag) {
  await requireStockForeground(`malaysia-filter-${tag}`);
  let xml = dumpUi(`screener-${tag}`);
  const bursa = findMalaysiaMarketFilter(xml, findLabels);
  if (bursa) {
    const tapFilter = await guardedTap(bursa, `malaysia-${tag}`);
    if (!tapFilter.ok) {
      sh(`adb shell input tap ${MALAYSIA_FILTER_FALLBACK.cx} ${MALAYSIA_FILTER_FALLBACK.cy}`, {
        allowFail: true,
      });
    }
  } else {
    sh(`adb shell input tap ${MALAYSIA_FILTER_FALLBACK.cx} ${MALAYSIA_FILTER_FALLBACK.cy}`, {
      allowFail: true,
    });
  }
  await sleep(1200);
  return dumpUi(`screener-bursa-${tag}`);
}

function recordStockVerifyFailure(stock, reason, extra = {}) {
  const focus = dumpCurrentFocus(sh);
  const shotPath = path.join(OUT_DIR, `search-fail-${stock.code}.png`);
  sh('adb shell screencap -p /sdcard/p125-fail.png', { allowFail: true });
  sh(`adb pull /sdcard/p125-fail.png "${shotPath}"`, { allowFail: true });
  dumpUi(`search-fail-${stock.code}`);
  return {
    code: stock.code,
    label: stock.label,
    query: stockSearchInputText(stock),
    queriesTried: extra.queriesTried ?? stockSearchQueries(stock),
    ok: false,
    reason,
    foreground: focus.package,
    focus,
    screenshot: `docs/review/phase12-5-long-run/search-fail-${stock.code}.png`,
    ...extra,
  };
}

function recordDetailFailure(stock, reason, extra = {}) {
  const focus = dumpCurrentFocus(sh);
  const shotPath = path.join(OUT_DIR, `detail-fail-${stock.code}.png`);
  sh('adb shell screencap -p /sdcard/p125-detail-fail.png', { allowFail: true });
  sh(`adb pull /sdcard/p125-detail-fail.png "${shotPath}"`, { allowFail: true });
  dumpUi(`detail-fail-${stock.code}`);
  if (extra.tapLabel) {
    fs.writeFileSync(
      path.join(OUT_DIR, `detail-fail-${stock.code}-tap.txt`),
      `${extra.tapLabel}\n${JSON.stringify(extra.tapTarget ?? {}, null, 2)}\n`,
      'utf8',
    );
  }
  fs.writeFileSync(
    path.join(OUT_DIR, `detail-fail-${stock.code}-focus.txt`),
    `${focus.raw}\npackage=${focus.package}\n`,
    'utf8',
  );
  return {
    code: stock.code,
    label: stock.label,
    query: extra.winningQuery ?? stockSearchInputText(stock),
    queriesTried: extra.queriesTried ?? stockSearchQueries(stock),
    cardFound: true,
    ok: false,
    visible: false,
    reason,
    foreground: focus.package,
    focus,
    screenshot: `docs/review/phase12-5-long-run/detail-fail-${stock.code}.png`,
    ...extra,
  };
}

async function runPriceRefresh(hourIndex, minuteIndex) {
  const tag = `h${hourIndex}-m${minuteIndex}`;
  console.log(`[p12.5] price refresh ${tag}`);
  const ok = await ensureAppForeground();
  if (!ok) {
    state.pidLostEvents += 1;
    return { tag, ok: false, error: 'app not running' };
  }
  await tapTab('保有銘柄');
  await sleep(3000);
  let xml = dumpUi(`price-${tag}-before`);
  let btn = findLabels(xml, (l) => l.includes('株価を自動更新') || l.includes('更新中'));
  if (!btn.length) {
    sh('adb shell input swipe 540 700 540 1800 350', { allowFail: true });
    await sleep(800);
    xml = dumpUi(`price-${tag}-scroll`);
    btn = findLabels(xml, (l) => l.includes('株価を自動更新') || l.includes('更新中'));
  }
  if (btn[0]) tap(btn[0]);
  else sh('adb shell input tap 540 520', { allowFail: true });
  await sleep(25000);
  xml = dumpUi(`price-${tag}-after`);
  const hasError =
    xml.includes('Cannot convert undefined') ||
    xml.includes('Unfortunately') ||
    xml.includes('クラッシュ');
  const result = { tag, ok: !hasError, hasError, at: new Date().toISOString() };
  state.priceRefreshRuns.push(result);
  appendTelemetry({ type: 'price_refresh', ...result });
  return result;
}

async function trySearchQuery(stock, queryText, tag) {
  const preInput = await requireStockForeground(`verify-search-${stock.code}-${tag}`);
  if (!preInput.ok) {
    return { ok: false, reason: 'wrong_foreground_before_input', phase: 'search', queryText };
  }

  await ensureMalaysiaFilterActive(`pre-${stock.code}-${tag}`);
  await dismissOverlayDialogs(`search-${stock.code}-${tag}`);

  let xml = dumpUi(`search-pre-${stock.code}-${tag}`);
  const field = screenerSearchFieldCenter(xml);
  const tapField = await guardedTap({ cx: field.cx, cy: field.cy, label: 'search-field' }, `${stock.code}-field`);
  if (!tapField.ok) return { ok: false, reason: tapField.reason ?? 'tap_field_failed', queryText };

  await sleep(400);
  await clearSearchField(sh, sleep);

  const typed = await safeInputText({
    sh,
    pkg: PKG,
    text: queryText,
    sleep,
    ensureForeground: () => requireStockForeground(`input-${stock.code}-${tag}`),
  });
  if (!typed.ok) {
    return {
      ok: false,
      reason: typed.reason ?? 'input_failed',
      queryText,
      foreground: typed.foreground,
    };
  }

  await sleep(10000);
  xml = dumpUi(`search-${stock.code}-${tag}`);
  const cards = findStockSearchCards(xml, stock, findLabels);
  const notFound = xml.includes('該当する銘柄が見つかりません') || (xml.includes('0件') && !cards.length);
  return { ok: cards.length > 0, cards, queryText, notFound, xml };
}

async function performStockSearch(stock) {
  const queriesTried = stockSearchQueries(stock);
  await openScreenerMalaysia();

  /** @type {Array<{ queryText: string, ok: boolean, notFound?: boolean }>} */
  const attempts = [];

  for (let i = 0; i < queriesTried.length; i++) {
    const queryText = queriesTried[i];
    console.log(`[p12.5] search ${stock.code} try ${i + 1}/${queriesTried.length} query="${queryText}"`);
    const result = await trySearchQuery(stock, queryText, `q${i}`);
    attempts.push({ queryText, ok: result.ok, notFound: result.notFound });
    if (result.ok && result.cards?.length) {
      return {
        ok: true,
        cards: result.cards,
        winningQuery: queryText,
        queriesTried: attempts.map((a) => a.queryText),
        attempts,
      };
    }
    if (i < queriesTried.length - 1) {
      await requireStockForeground(`search-next-query-${stock.code}`);
    }
  }

  return {
    ok: false,
    queriesTried: attempts.map((a) => a.queryText),
    attempts,
    notFound: true,
  };
}

async function waitForStockDetail(stock, winningQuery) {
  const deadline = Date.now() + resolveDetailWaitMs(stock);
  let detail = '';
  let lastForeground = PKG;
  let foregroundRecoveries = 0;
  const MAX_FG_RECOVERIES = 3;

  while (Date.now() < deadline) {
    const focusSnap = dumpCurrentFocus(sh);
    const fgPkg = focusSnap.package;

    if (isForeignAppForeground(fgPkg)) {
      console.warn(
        `[p12.5] WARN detail-wait foreign fg=${fgPkg || 'unknown'} ${stock.code} recoveries=${foregroundRecoveries}`,
      );
      if (foregroundRecoveries >= MAX_FG_RECOVERIES) {
        return {
          detail,
          hasError: false,
          visible: false,
          reason: 'wrong_foreground_detail',
          foreground: fgPkg,
          retryable: true,
          winningQuery,
          foregroundRecoveries,
        };
      }
      const fg = await safeEnsureAppForeground(
        adbForegroundCtx(`detail-recover-${stock.code}-${foregroundRecoveries}`),
      );
      foregroundRecoveries += 1;
      lastForeground = fg.foreground ?? lastForeground;
      await sleep(2000);
      continue;
    }

    lastForeground = fgPkg || lastForeground;
    detail = dumpUi(`detail-${stock.code}`);
    const hasError =
      detail.includes('Cannot convert undefined') ||
      detail.includes('Unfortunately') ||
      detail.includes('クラッシュ');
    if (hasError) return { detail, hasError: true, visible: false, foreground: lastForeground };
    if (isWrongStockDetail(detail, stock)) {
      return {
        detail,
        hasError: false,
        visible: false,
        wrongStock: true,
        reason: 'wrong_detail_stock',
        foreground: lastForeground,
        retryable: true,
        winningQuery,
      };
    }
    if (isStockDetailVisible(detail, stock)) {
      return {
        detail,
        hasError: false,
        visible: true,
        foreground: lastForeground,
        winningQuery,
        foregroundRecoveries,
      };
    }
    if (isDetailLoading(detail)) {
      await sleep(2500);
      continue;
    }
    await sleep(2000);
  }

  return {
    detail,
    hasError: false,
    visible: false,
    reason: 'detail_not_visible',
    foreground: lastForeground,
    retryable: true,
    winningQuery,
    foregroundRecoveries,
  };
}

async function verifyStockDeviceOnce(stock, deviceAttempt) {
  const started = Date.now();
  const queriesPlanned = stockSearchQueries(stock);
  console.log(
    `[p12.5] verify stock ${stock.code} ${stock.label} queries=[${queriesPlanned.join(', ')}] attempt=${deviceAttempt}`,
  );

  wakeDevice();
  const boot = await requireStockForeground(`verify-${stock.code}-a${deviceAttempt}`);
  if (!boot.ok) {
    return recordStockVerifyFailure(stock, 'wrong_foreground_before_verify', {
      phase: 'boot',
      deviceAttempt,
      queriesTried: queriesPlanned,
    });
  }

  sh('adb shell input keyevent 4', { allowFail: true });
  await sleep(500);

  const search = await performStockSearch(stock);
  if (!search.ok) {
    return recordStockVerifyFailure(stock, 'card not found', {
      phase: 'search_result',
      queriesTried: search.queriesTried,
      attempts: search.attempts,
      notFound: search.notFound,
      deviceAttempt,
    });
  }

  if (Date.now() - started > MAX_STOCK_VERIFY_MS) {
    return recordStockVerifyFailure(stock, 'verify_timeout', {
      phase: 'search_wait',
      queriesTried: search.queriesTried,
      deviceAttempt,
    });
  }

  const card = pickBestStockCard(stock, search.cards);
  if (!card) {
    return recordStockVerifyFailure(stock, 'card not found', {
      phase: 'pick_card',
      queriesTried: search.queriesTried,
      deviceAttempt,
    });
  }

  const tapTargets = pickStockCardTapTargets(stock, search.cards);
  /** @type {{ visible?: boolean, hasError?: boolean, reason?: string, foreground?: string, winningQuery?: string, wrongStock?: boolean, retryable?: boolean, detail?: string } | null} */
  let detailResult = null;

  for (let tapIdx = 0; tapIdx < tapTargets.length; tapIdx++) {
    const target = tapTargets[tapIdx];
    const tapCard = await guardedTap(target, `${stock.code}-card-${tapIdx}`);
    if (!tapCard.ok) {
      if (tapIdx === tapTargets.length - 1) {
        return recordStockVerifyFailure(stock, tapCard.reason ?? 'tap_card_failed', {
          phase: 'tap_card',
          queriesTried: search.queriesTried,
          winningQuery: search.winningQuery,
          deviceAttempt,
        });
      }
      continue;
    }

    detailResult = await waitForStockDetail(stock, search.winningQuery);
    if (detailResult.visible && !detailResult.hasError) {
      sh('adb shell input keyevent 4', { allowFail: true });
      await sleep(800);
      return {
        code: stock.code,
        label: stock.label,
        query: search.winningQuery,
        queriesTried: search.queriesTried,
        cardFound: true,
        ok: true,
        visible: true,
        hasError: false,
        foreground: dumpCurrentFocus(sh).package,
        deviceAttempt,
        tapLabel: target.label,
      };
    }

    if (detailResult.wrongStock) {
      console.warn(
        `[p12.5] WARN wrong detail ${stock.code} tap=${tapIdx} label="${target.label}"`,
      );
    }

    sh('adb shell input keyevent 4', { allowFail: true });
    await sleep(800);
    await requireStockForeground(`detail-back-${stock.code}-${tapIdx}`);

    if (tapIdx < tapTargets.length - 1) {
      await sleep(500);
      continue;
    }
  }

  sh('adb shell input keyevent 4', { allowFail: true });
  await sleep(800);

  return recordDetailFailure(stock, detailResult?.reason ?? 'detail_not_visible', {
    hasError: detailResult?.hasError ?? false,
    foreground: detailResult?.foreground,
    winningQuery: search.winningQuery,
    queriesTried: search.queriesTried,
    retryable: detailResult?.retryable ?? true,
    deviceAttempt,
    tapLabel: tapTargets[tapTargets.length - 1]?.label,
    tapTarget: tapTargets[tapTargets.length - 1],
    foregroundRecoveries: detailResult?.foregroundRecoveries,
  });
}

function stocksForVerification() {
  const only = (process.env.PHASE12_5_STOCK_CODE ?? '').trim();
  if (!only) return STOCKS;
  const filtered = STOCKS.filter((s) => s.code === only);
  if (!filtered.length) {
    console.warn(`[p12.5] WARN unknown PHASE12_5_STOCK_CODE=${only} — using all stocks`);
    return STOCKS;
  }
  console.log(`[p12.5] stock filter PHASE12_5_STOCK_CODE=${only}`);
  return filtered;
}

async function verifyStockDevice(stock) {
  let result = await verifyStockDeviceOnce(stock, 0);
  if (
    !result.ok &&
    result.retryable &&
    (result.reason === 'detail_not_visible' ||
      result.reason === 'wrong_detail_stock' ||
      result.reason === 'wrong_foreground_detail' ||
      result.cardFound)
  ) {
    console.warn(`[p12.5] WARN retry whole verify ${stock.code} reason=${result.reason}`);
    await requireStockForeground(`verify-retry-${stock.code}`);
    await sleep(1000);
    result = await verifyStockDeviceOnce(stock, 1);
    result.retried = true;
  }
  return result;
}

async function verifyAllStocks() {
  const rows = [];
  for (const stock of stocksForVerification()) {
    const row = await verifyStockDevice(stock);
    rows.push(row);
    appendTelemetry({ type: 'stock_verify', ...row, at: new Date().toISOString() });
    await sleep(1500);
  }
  return { rows, allOk: rows.every((r) => r.ok) };
}

async function runMaterialAnalysisRefresh(hourIndex) {
  const tag = `hour-${hourIndex}`;
  await ensureAppForeground();
  await tapTab('材料分析');
  await sleep(6000);
  let xml = dumpUi(`mat-${tag}-open`);
  const refreshBtn = findLabels(xml, (l) => l === '再取得');
  if (refreshBtn[0]) {
    tap(refreshBtn[0]);
    await sleep(8000);
  }
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    xml = dumpUi(`mat-${tag}-wait`);
    if (xml.includes('【銘柄別材料分析】') && !xml.includes('材料分析を取得中')) break;
    await sleep(4000);
  }
  const hasError = xml.includes('Cannot convert undefined');
  return { tag, ok: !hasError && !xml.includes('材料分析を取得中'), at: new Date().toISOString() };
}

async function runAiAnalysis(hourIndex) {
  const tag = `hour-${hourIndex}`;
  console.log(`[p12.5] AI analysis ${tag}`);
  const ok = await ensureAppForeground();
  if (!ok) {
    state.pidLostEvents += 1;
    return { tag, ok: false, error: 'app not running' };
  }

  const material = await runMaterialAnalysisRefresh(hourIndex);
  const totalHours = Math.max(1, Math.ceil(HOURS));
  let stockCheck;
  if (hourIndex === 0 || hourIndex >= totalHours) {
    stockCheck = await verifyAllStocks();
  } else {
    const stock = STOCKS[hourIndex % STOCKS.length];
    const row = await verifyStockDevice(stock);
    stockCheck = { rows: [row], allOk: row.ok, partial: true, rotated: stock.code };
  }

  const shotPath = path.join(OUT_DIR, `ai-${tag}.png`);
  sh(`adb shell screencap -p /sdcard/p125-ai.png`, { allowFail: true });
  sh(`adb pull /sdcard/p125-ai.png "${shotPath}"`, { allowFail: true });

  const result = {
    tag,
    ok: material.ok && (stockCheck.allOk || stockCheck.partial),
    material,
    stockCheck,
    at: new Date().toISOString(),
    screenshot: `docs/review/phase12-5-long-run/ai-${tag}.png`,
  };
  state.aiAnalysisRuns.push(result);
  state.stockChecks.push({ hour: hourIndex, ...stockCheck, at: result.at });
  appendTelemetry({ type: 'ai_analysis', ...result });
  return result;
}

function scanLogcatDelta() {
  const raw = sh('adb logcat -d', { allowFail: true });
  const metrics = parseLogcatMetrics(raw);
  state.crashes = {
    fatal: metrics.fatal,
    rnTypeError: metrics.rnTypeError,
    undefined: metrics.undefined,
  };
  state.anrCount = metrics.anr;
  return metrics;
}

function recordLogFinalizationWarning(warning) {
  if (!warning) return;
  state.logFinalizationWarnings.push(warning);
  console.warn('[p12.5] WARN logcat finalization:', warning.message ?? warning);
}

function finalizeLogcatArtifacts({ adbDumpText = null, mockFail = false } = {}) {
  const dump = adbDumpText ?? sh('adb logcat -d', { allowFail: true });
  const result = finalizeLogcatSnapshot({
    rootDir: ROOT,
    outDir: 'docs/review/phase12-5-long-run',
    twelveHourLogDir: 'docs/review/twelve-hour-test',
    liveRelativePath: DEFAULT_LIVE_LOGCAT,
    adbDumpText: dump,
    mockFail: mockFail || process.env.PHASE12_5_LOGCAT_FINALIZE_MOCK_FAIL === '1',
  });
  if (result.path) state.logcatSnapshotPaths.push(result.path);
  if (result.snapshotPath && result.snapshotPath !== result.path) {
    state.logcatSnapshotPaths.push(result.snapshotPath);
  }
  if (result.warning) recordLogFinalizationWarning(result.warning);
  return result;
}

function hasUnrecoverablePriceFailure() {
  if (!state.priceRefreshRuns.length) return false;
  const recent = state.priceRefreshRuns.slice(-4);
  return recent.length >= 4 && recent.every((r) => !r.ok);
}

function applyDetectorMetroFields(metro, metroDown) {
  if (metro) {
    state.lastMetroCheck = metro.checkedAt ?? new Date().toISOString();
    state.metroPid = metro.pid ?? null;
  }
  if (metroDown) {
    state.metroDownAt = metroDown.metroDownAt ?? state.lastMetroCheck;
    state.metroCheckDetails = metroDown.metroCheckDetails ?? null;
  } else if (metro && !metro.listening && !state.metroDownAt) {
    state.metroDownAt = state.lastMetroCheck;
  }
}

function runInvalidDetectors() {
  const currentAppPid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim();
  const result = runInvalidDetectorPass({
    fs,
    execSync: sh,
    liveLogcatPath: LIVE_LOGCAT_PATH,
    watchLogPath: PRE_RUN_WATCH_PATH,
    logcatScanOffset: state.logcatScanOffset,
    baselineAppPid: state.baselineAppPid,
    currentAppPid,
    runnerStartedMs: state.runnerStartedMs ?? Date.now(),
    nowMs: Date.now(),
    runtimeMode: state.runtimeMode,
    checkWatch: fs.existsSync(PRE_RUN_WATCH_PATH),
  });
  if (result.metro) applyDetectorMetroFields(result.metro, result.metroDownAt ? result : null);
  if (result.metroDownAt) {
    state.metroDownAt = result.metroDownAt;
    state.metroCheckDetails = result.metroCheckDetails ?? state.metroCheckDetails;
  }
  if (result.newLogcatScanOffset != null) {
    state.logcatScanOffset = result.newLogcatScanOffset;
  }
  if (result.detectorError) {
    state.detectorErrors.push(`${new Date().toISOString()}: ${result.detectorError}`);
    console.warn('[p12.5] WARN detector pass:', result.detectorError);
  }
  if (result.watchWarn) {
    console.warn(`[p12.5] WARN pre-run-watch stale ${result.watch?.ageSec ?? '?'}s`);
  }
  if (result.bundleWarn && result.bundle) {
    state.bundleWarnCount = (state.bundleWarnCount ?? 0) + 1;
    console.warn(
      `[p12.5] WARN bundle_error (${state.runtimeMode} mode): ${(result.bundle.matchingLine ?? result.detail ?? '').slice(0, 120)}`,
    );
  }
  if (result.stop && result.stopReason === 'bundle_error' && result.bundle) {
    state.bundleErrorAt = result.bundle.bundleErrorAt ?? new Date().toISOString();
    state.bundleMatchingLine = result.bundle.matchingLine ?? result.detail ?? null;
    state.bundleSourceFile = result.bundle.sourceFile ?? LIVE_LOGCAT_PATH;
  }
  if (result.stop && result.stopReason === 'watch_dead') {
    state.watchDeadAt = new Date().toISOString();
  }
  if (result.previousPid !== undefined) state.previousPid = result.previousPid;
  if (result.currentPid !== undefined) state.currentPid = result.currentPid;
  if (result.stop && result.stopReason === 'app_pid_lost') {
    state.pidLostEvents += 1;
  }
  if (result.stop && result.stopReason === 'app_pid_changed') {
    state.pidChangedEvents += 1;
  }
  return result;
}

async function gracefulInvalidExit(stopReason, detail) {
  state.stopReason = stopReason;
  state.endedAt = new Date().toISOString();
  console.error(`[p12.5] INVALID stopReason=${stopReason} ${detail ?? ''}`);
  try {
    scanLogcatDelta();
  } catch (scanErr) {
    recordLogFinalizationWarning({
      at: new Date().toISOString(),
      code: scanErr?.code ?? 'SCAN_ERROR',
      message: scanErr?.message ?? String(scanErr),
      source: 'scanLogcatDelta',
    });
  }
  try {
    finalizeLogcatArtifacts();
  } catch {
    /* ignore */
  }
  writeInvalidReasonArtifacts({ logDir: TWELVE_HOUR_LOG_DIR, state });
  saveCheckpoint();
  writeProgressReport('FAILED', detail ?? stopReason);
  process.exit(1);
}

async function hourlySnapshot(hourIndex) {
  console.log(`[p12.5] hourly snapshot ${hourIndex}`);
  wakeDevice();
  const mem = sampleMemory(`hour-${String(hourIndex).padStart(2, '0')}`);
  const cpu = sampleCpu();
  const storage = sampleAsyncStorageKb();
  state.hourlyMemKb.push({ hour: hourIndex, kb: mem.kb, at: mem.at });
  state.cpuSamples.push({ hour: hourIndex, ...cpu });
  state.storageSamples.push({ hour: hourIndex, ...storage });
  appendTelemetry({ type: 'hourly', hour: hourIndex, mem, cpu, storage });
  saveCheckpoint();
  writeProgressReport('RUNNING');
  return { mem, cpu, storage };
}

function memoryLeakPass() {
  if (state.baselineMemKb == null || state.hourlyMemKb.length === 0) return false;
  const end = state.hourlyMemKb[state.hourlyMemKb.length - 1]?.kb;
  if (end == null) return false;
  const increase = (end - state.baselineMemKb) / state.baselineMemKb;
  return increase <= 0.2;
}

function stocksPass() {
  const passed = new Set();
  for (const check of state.stockChecks) {
    for (const row of check.rows ?? []) {
      if (row.ok) passed.add(row.code);
    }
  }
  return STOCKS.every((s) => passed.has(s.code));
}

function memIncreasePct() {
  if (!state.baselineMemKb || !state.hourlyMemKb.length) return null;
  const end = state.hourlyMemKb[state.hourlyMemKb.length - 1]?.kb;
  if (end == null) return null;
  return (((end - state.baselineMemKb) / state.baselineMemKb) * 100).toFixed(1);
}

/** A. Conditions that should FAIL the long-run test body. */
function evaluateTestBodyPass() {
  const crashFree = state.crashes.fatal === 0 && state.crashes.undefined === 0;
  const anrFree = state.anrCount === 0;
  const pidOk = state.pidLostEvents === 0 && (state.pidChangedEvents ?? 0) === 0;
  const adbConnected = adbOk();
  const metro = checkMetroListening({ execSync: sh });
  const metroListening = state.runtimeMode === 'apk' ? true : metro.listening;
  const priceOk = !hasUnrecoverablePriceFailure();
  return {
    overall: crashFree && anrFree && pidOk && adbConnected && metroListening && priceOk,
    crashFree,
    anrFree,
    pidOk,
    adbConnected,
    metroListening,
    priceOk,
  };
}

/** B. WARN-only conditions — do not fail exit code or stop the orchestrator. */
function evaluateWarnings() {
  return {
    logFinalizationWarnings: state.logFinalizationWarnings,
    uiDumpWarnings: state.uiDumpWarnings,
    stocksOk: stocksPass(),
    memOk: memoryLeakPass(),
    memIncreasePct: memIncreasePct(),
    logcatSnapshots: state.logcatSnapshotPaths,
    uiDumpSnapshots: state.uiDumpPaths,
  };
}

function evaluatePass() {
  const body = evaluateTestBodyPass();
  const warnings = evaluateWarnings();
  return { ...body, ...warnings, overall: body.overall };
}

function elapsedHuman() {
  if (!state.startedAt) return null;
  const endMs = state.endedAt ? Date.parse(state.endedAt) : Date.now();
  const ms = endMs - Date.parse(state.startedAt);
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function writeProgressReport(status, detail = null) {
  const eval_ = evaluatePass();
  const elapsed = elapsedHuman();
  const statusLine =
    status === 'COMPLETED'
      ? `## 総合判定: **${eval_.overall ? 'PASS' : 'FAIL'}**（テスト本体）`
      : status === 'FAILED' || status === 'INTERRUPTED'
        ? `## 総合判定: **FAILED**（${status === 'INTERRUPTED' ? '中断' : 'テスト本体NG'}${elapsed ? ` · 約${elapsed}` : ''}）`
        : '## 総合判定: **進行中**';

  const lines = [
    '# Phase12.5 Long Run Validation Report',
    '',
    `**ステータス:** ${status}`,
    `**開始:** ${state.startedAt ?? '—'}`,
    `**終了:** ${state.endedAt ?? '—'}`,
    `**経過:** ${elapsed ?? '—'}`,
    `**計画時間:** ${HOURS} 時間`,
    `**実機:** Redmi (adb)`,
    state.stopReason ? `**停止理由:** ${state.stopReason}` : null,
    detail ? `**詳細:** ${detail}` : null,
    '',
    statusLine,
    '',
    '### テスト本体 FAIL 条件（A）',
    '',
    '| 条件 | 判定 | 結果 |',
    '|------|------|------|',
    `| クラッシュ0 | ${eval_.crashFree ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | FATAL=${state.crashes.fatal}, undefined=${state.crashes.undefined} |`,
    `| ANR0 | ${eval_.anrFree ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ANR=${state.anrCount} |`,
    `| プロセス消失0 | ${eval_.pidOk ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | pidLost=${state.pidLostEvents} |`,
    `| adb device | ${eval_.adbConnected ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ${eval_.adbConnected ? 'connected' : 'missing'} |`,
    `| Metro :8081 | ${state.runtimeMode === 'apk' ? 'N/A (apk mode)' : eval_.metroListening ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | ${state.runtimeMode === 'apk' ? 'skipped' : eval_.metroListening ? 'LISTENING' : 'down'} |`,
    `| 価格更新復帰 | ${eval_.priceOk ? 'PASS' : status === 'RUNNING' ? '—' : 'FAIL'} | 直近4回連続失敗でFAIL |`,
    '',
    '### WARN 条件（B — 本体FAILにしない）',
    '',
    '| 条件 | 判定 | 結果 |',
    '|------|------|------|',
    `| logcat finalization | ${eval_.logFinalizationWarnings.length ? 'WARN' : 'PASS'} | ${eval_.logFinalizationWarnings.length} 件 |`,
    `| UI dump 保存 | ${eval_.uiDumpWarnings.length ? 'WARN' : 'PASS'} | ${eval_.uiDumpWarnings.length} 件 · timestamp 付き \`ui-dump-*.xml\` |`,
    `| 全銘柄UI表示 | ${eval_.stocksOk ? 'PASS' : 'WARN'} | adb UI card not found 等 |`,
    `| メモリ増加20%以内 | ${eval_.memOk ? 'PASS' : 'WARN'} | ${eval_.memIncreasePct != null ? `+${eval_.memIncreasePct}%` : '—'} |`,
    '',
    ...(eval_.logFinalizationWarnings.length
      ? [
          '#### logFinalizationWarnings',
          '',
          ...eval_.logFinalizationWarnings.map(
            (w) => `- ${w.at ?? '—'}: \`${w.code ?? 'WARN'}\` — ${w.message ?? JSON.stringify(w)}`,
          ),
          '',
        ]
      : []),
    ...(eval_.uiDumpWarnings.length
      ? [
          '#### uiDumpWarnings',
          '',
          ...eval_.uiDumpWarnings.map(
            (w) => `- ${w.at ?? '—'}: \`${w.code ?? 'WARN'}\` label=${w.label ?? '—'} — ${w.message ?? JSON.stringify(w)}`,
          ),
          '',
        ]
      : []),
    '### 検証銘柄',
    '',
    ...STOCKS.map((s) => `- ${s.code} ${s.label}`),
    '',
    '### 1時間ごとメモリ (KB)',
    '',
    '| Hour | TOTAL KB |',
    '|------|----------|',
    ...state.hourlyMemKb.map((h) => `| ${h.hour} | ${h.kb ?? '—'} |`),
    '',
    '### CPU使用率サンプル',
    '',
    '| Hour | CPU % |',
    '|------|-------|',
    ...state.cpuSamples.map((c) => `| ${c.hour} | ${c.percent ?? '—'} |`),
    '',
    '### AsyncStorageサイズ (KB)',
    '',
    '| Hour | RKStorage | App data total |',
    '|------|-----------|----------------|',
    ...state.storageSamples.map((s) => `| ${s.hour ?? '—'} | ${s.rkKb ?? '—'} | ${s.totalKb ?? '—'} |`),
    '',
    '### 実行回数',
    '',
    `- 株価更新 (15分毎): ${state.priceRefreshRuns.length} 回 (失敗 ${state.priceRefreshRuns.filter((r) => !r.ok).length})`,
    `- AI分析 (1時間毎): ${state.aiAnalysisRuns.length} 回 (失敗 ${state.aiAnalysisRuns.filter((r) => !r.ok).length})`,
    `- プロセス消失: ${state.pidLostEvents}`,
    '',
    '### エビデンス',
    '',
    '- `docs/review/phase12-5-long-run/telemetry.jsonl`',
    '- `docs/review/phase12-5-long-run/checkpoint.json`',
    `- live logcat: \`${DEFAULT_LIVE_LOGCAT}\`（追記専用）`,
    ...(eval_.logcatSnapshots.length
      ? eval_.logcatSnapshots.map((p) => `- snapshot: \`${path.relative(ROOT, p).replace(/\\/g, '/')}\``)
      : ['- snapshot: `docs/review/phase12-5-long-run/logcat-snapshot-*.txt`（timestamp 付き）']),
    '- `docs/review/twelve-hour-test/adb-logcat-final-*.log`（終了時コピー）',
    '- `docs/review/phase12-5-long-run/meminfo-hour-*.txt`',
    '- `docs/review/phase12-5-long-run/ui-dump-*.xml`（timestamp 付き · 固定 `dismiss.xml` は不使用）',
    '',
    '### 再実行',
    '',
    '```powershell',
    'npm run verify:phase12-5',
    '# または',
    'PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs',
    '```',
    '',
  ].filter((line) => line !== null);
  fs.writeFileSync(REPORT_PATH, lines.join('\n'));
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  if (!adbOk()) {
    if (process.env.PHASE12_5_DRY_RUN === '1') {
      console.warn('[p12.5] WARN dry-run: adb device not found — logcat finalization only');
    } else {
      console.error('[p12.5] FAIL: adb device not found');
      process.exit(2);
    }
  } else {
    try {
      sh('adb reverse tcp:8081 tcp:8081', { allowFail: true });
    } catch {
      /* ignore */
    }
  }

  if (process.env.PHASE12_5_SMOKE === '1' && HOURS < 1) {
    ensurePortrait(sh);
    const bootFg = await requireStockForeground('smoke-boot');
    if (!bootFg.ok) {
      console.error('[p12.5] smoke FAIL: app not in foreground', bootFg);
      process.exit(2);
    }
    await ensureAppForeground();
    const stockCheck = await verifyAllStocks();
    const priceRefresh = await runPriceRefresh(0, 0);
    const logMetrics = scanLogcatDelta();
    const pid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim();
    const monitorLines = sh(`adb logcat -d --pid=${pid}`, { allowFail: true })
      .split('\n')
      .filter((l) => l.includes('12H-MONITOR'));
    const bundleHit = sh(`adb logcat -d --pid=${pid}`, { allowFail: true }).includes('Could not load bundle');
    const payload = {
      stockCheck,
      priceRefresh,
      logMetrics,
      monitorLineCount: monitorLines.length,
      monitorSample: monitorLines.slice(-3),
      bundleError: bundleHit,
      foreground: dumpCurrentFocus(sh),
      pid,
    };
    console.log(JSON.stringify(payload, null, 2));
    const smokeOk =
      stockCheck.allOk &&
      !bundleHit &&
      logMetrics.fatal === 0 &&
      logMetrics.anr === 0 &&
      bootFg.ok;
    process.exit(smokeOk ? 0 : 1);
  }

  if (process.env.PHASE12_5_DRY_RUN === '1') {
    state.startedAt = new Date().toISOString();
    fs.mkdirSync(TWELVE_HOUR_LOG_DIR, { recursive: true });
    if (!fs.existsSync(LIVE_LOGCAT_PATH)) {
      fs.appendFileSync(LIVE_LOGCAT_PATH, '[dry-run] live logcat placeholder\n', 'utf8');
    }
    if (adbOk()) {
      scanLogcatDelta();
    } else {
      const tail = fs.readFileSync(LIVE_LOGCAT_PATH, 'utf8').slice(-65536);
      const metrics = parseLogcatMetrics(tail);
      state.crashes = {
        fatal: metrics.fatal,
        rnTypeError: metrics.rnTypeError,
        undefined: metrics.undefined,
      };
      state.anrCount = metrics.anr;
    }
    const fin = finalizeLogcatArtifacts({
      adbDumpText: adbOk() ? null : '[dry-run] adb unavailable — live log only\n',
    });
    state.endedAt = new Date().toISOString();
    saveCheckpoint();
    writeProgressReport('COMPLETED', 'dry-run logcat finalization');
    console.log(JSON.stringify({ fin, warnings: state.logFinalizationWarnings }, null, 2));
    process.exit(0);
  }

  state.startedAt = new Date().toISOString();
  state.runnerStartedMs = Date.now();
  state.runtimeMode = resolvePhase125RuntimeMode();
  console.log(`[p12.5] runtimeMode=${state.runtimeMode}`);
  fs.mkdirSync(TWELVE_HOUR_LOG_DIR, { recursive: true });
  state.logcatScanOffset = fs.existsSync(LIVE_LOGCAT_PATH) ? fs.statSync(LIVE_LOGCAT_PATH).size : 0;
  sh('adb logcat -c', { allowFail: true });
  await ensureAppForeground();
  state.baselineAppPid = sh(`adb shell pidof ${PKG}`, { allowFail: true }).trim() || null;
  console.log(`[p12.5] baselineAppPid=${state.baselineAppPid ?? 'none'}`);

  const baseline = sampleMemory('baseline');
  state.baselineMemKb = baseline.kb;
  state.hourlyMemKb.push({ hour: 0, kb: baseline.kb, at: baseline.at });
  state.cpuSamples.push({ hour: 0, ...sampleCpu() });
  state.storageSamples.push({ hour: 0, ...sampleAsyncStorageKb() });
  appendTelemetry({ type: 'start', baseline, hours: HOURS });
  spawnSync('npx tsx scripts/phase12-5-node-stocks.ts', {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  writeProgressReport('RUNNING');
  console.log(`[p12.5] Started — ${HOURS}h run, ends ~${new Date(Date.now() + DURATION_MS).toISOString()}`);

  const startMs = Date.now();
  let lastHour = 0;
  let lastPriceMs = startMs;

  await runAiAnalysis(0);
  await runPriceRefresh(0, 0);
  lastPriceMs = Date.now();

  while (Date.now() - startMs < DURATION_MS) {
    const detector = runInvalidDetectors();
    if (detector.stop) {
      await gracefulInvalidExit(detector.stopReason, detector.detail);
    }

    await sleep(TICK_MS);
    const elapsed = Date.now() - startMs;
    const hourIndex = Math.floor(elapsed / HOUR_MS);

    if (hourIndex > lastHour) {
      lastHour = hourIndex;
      await hourlySnapshot(hourIndex);
      await runAiAnalysis(hourIndex);
    }

    if (Date.now() - lastPriceMs >= PRICE_INTERVAL_MS) {
      const minuteIndex = Math.floor((elapsed % HOUR_MS) / (15 * 60 * 1000)) * 15;
      await runPriceRefresh(hourIndex, minuteIndex);
      lastPriceMs = Date.now();
    }

    if (Math.floor(elapsed / 60000) % 10 === 0) {
      scanLogcatDelta();
      saveCheckpoint();
    }
  }

  state.endedAt = new Date().toISOString();
  scanLogcatDelta();
  finalizeLogcatArtifacts();
  spawnSync('npx tsx scripts/phase12-5-node-stocks.ts', {
    shell: true,
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const finalMem = sampleMemory('final');
  state.hourlyMemKb.push({ hour: 'final', kb: finalMem.kb, at: finalMem.at });

  saveCheckpoint();
  writeProgressReport('COMPLETED');

  const eval_ = evaluateTestBodyPass();
  const warnings = evaluateWarnings();
  console.log(`[p12.5] COMPLETED — body ${eval_.overall ? 'PASS' : 'FAIL'}`);
  if (warnings.logFinalizationWarnings.length) {
    console.warn(`[p12.5] WARN log finalization issues: ${warnings.logFinalizationWarnings.length}`);
  }
  if (warnings.uiDumpWarnings.length) {
    console.warn(`[p12.5] WARN ui dump issues: ${warnings.uiDumpWarnings.length}`);
  }
  console.log(`[p12.5] Report: ${REPORT_PATH}`);
  process.exit(eval_.overall ? 0 : 1);
}

main().catch(async (e) => {
  state.endedAt = new Date().toISOString();
  state.stopReason = e?.message ?? String(e);
  try {
    scanLogcatDelta();
  } catch (scanErr) {
    recordLogFinalizationWarning({
      at: new Date().toISOString(),
      code: scanErr?.code ?? 'SCAN_ERROR',
      message: scanErr?.message ?? String(scanErr),
      source: 'scanLogcatDelta',
    });
  }
  finalizeLogcatArtifacts();
  if (state.stopReason && state.stopReason !== 'completed') {
    writeInvalidReasonArtifacts({ logDir: TWELVE_HOUR_LOG_DIR, state });
  }
  saveCheckpoint();
  writeProgressReport('INTERRUPTED', state.stopReason);
  console.error('[p12.5] ERROR', e);
  process.exit(1);
});
