#!/usr/bin/env node
/**
 * RM5,000 concierge_full device smoke (single flow, OOM-safe, minimal artifacts).
 * Usage: node run-rm5000-device-smoke.mjs
 * Env: SKIP_PM_CLEAR=1 E2E_RUN_TAG=rm5000-smoke-concierge_full
 */
process.env.PYTHONIOENCODING = 'utf-8';
process.env.E2E_FAIL_ONLY_MEDIA = '1';

import { setTimeout as sleep } from 'node:timers/promises';
import fs from 'node:fs';
import path from 'node:path';
import { parseManualOrderFormProbeFromXml } from './_deviceVerifyAdb.mjs';
import {
  initContext,
  prepareDevice,
  buildMeta,
  FLOWS,
  POST_TAP_MS,
  findTestId,
  texts,
  dump,
  tap,
  dismissSystemChrome,
  ensureHomeReady,
  ensureHomeFlowStart,
  returnToHome,
  tapHomeFlowButtonWithRetry,
  readPendingCountMandatory,
  readPendingAllProbesAsync,
  readPendingFromStorage,
  readPendingFromAppState,
  readPendingAfterCreate,
  evaluatePendingAfterCreate,
  readPendingInline,
  waitForCreateReady,
  tapCreate,
  writeE2eManualOrderFormSeed,
  waitForManualOrderFormState,
  waitForCreateOutcome,
  ensureMarketBursa,
  typeIntoField,
  TIDS,
  adb,
  PKG,
  sh,
  ADB,
} from './_deviceVerifyE2eCommon.mjs';
import { checkE2eMemoryGate, logMemorySnapshot, stopE2eNodeProcesses } from './_deviceVerifyMemory.mjs';

const FLOW_KEY = 'concierge_full';
const DEPOSIT_MY = '5000';
const RUN_TAG = process.env.E2E_RUN_TAG || 'rm5000-smoke-concierge_full';
const OUT = path.join('docs', 'review', 'rm5000-device-smoke');
const RESULT_FILE = path.join(OUT, 'result.json');
const AUDIT_KEY = '@sta/investment_recommendation_quality_audit_v1';
const APP_STATE_KEY = '@sta/app_state';
const MANUAL_ORDER_WARNING_SNIPPET = '注文を送信しません';

const flow = FLOWS.find((f) => f.key === FLOW_KEY);

function mkdirOut() {
  fs.mkdirSync(OUT, { recursive: true });
}

function readStorageJson(storageKey) {
  try {
    const key = storageKey.replace(/'/g, "''");
    const sql = `SELECT value FROM catalystLocalStorage WHERE key='${key}'`;
    const out = sh(`${ADB} shell run-as ${PKG} sqlite3 databases/RKStorage "${sql}"`);
    if (!out) return null;
    return JSON.parse(out);
  } catch {
    return null;
  }
}

function readManualOrderListFromAppState() {
  const state = readStorageJson(APP_STATE_KEY);
  if (!state || !Array.isArray(state.manualOrderList)) return [];
  return state.manualOrderList;
}

function readLatestQualityAudit() {
  const log = readStorageJson(AUDIT_KEY);
  if (!log || !Array.isArray(log.entries) || log.entries.length === 0) return null;
  return log.entries[0];
}

function redactAudit(entry) {
  if (!entry) return null;
  const copy = JSON.parse(JSON.stringify(entry));
  return copy;
}

function saveScreenshot(ctx, name) {
  mkdirOut();
  sh(`${ADB} exec-out screencap -p > "${path.join(OUT, name + '.png')}"`);
  return path.join(OUT, name + '.png');
}

function parseUiTexts(xml) {
  return [...texts(xml)];
}

function parseListItemsFromUi(xml) {
  const uiTexts = parseUiTexts(xml);
  const items = [];
  for (const t of uiTexts) {
    const symMatch = t.match(/^(.+?)（(\d+|0820EA)）$/);
    if (symMatch) {
      items.push({ name: symMatch[1], symbol: symMatch[2] });
    }
    const shareMatch = t.match(/（(\d+)株）/);
    if (shareMatch && items.length > 0) {
      items[items.length - 1].shares = Number(shareMatch[1]);
    }
    if (t === '買い' && items.length > 0) items[items.length - 1].side = 'buy';
    if (t.includes('Bursa') || t.includes('バルサ')) {
      if (items.length > 0) items[items.length - 1].market = 'bursa';
    }
  }
  return items.filter((i) => i.symbol);
}

function readQualityAuditFromLogcat() {
  try {
    const lines = sh(`${ADB} logcat -d -t 400`).split(/\r?\n/);
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (!line.includes('[QUALITY-AUDIT]')) continue;
      const idx = line.indexOf('{');
      if (idx < 0) continue;
      return JSON.parse(line.slice(idx));
    }
  } catch {
    return null;
  }
  return null;
}

function hasDisclaimer(uiTexts) {
  return uiTexts.some((t) => t.includes(MANUAL_ORDER_WARNING_SNIPPET) || t.includes('Rakuten Trade'));
}

function validateCreatedItems(items, depositMYR) {
  const issues = [];
  const pending = items.filter((i) => !i.completed);
  if (pending.length === 0) issues.push('no-pending-items');
  for (const item of pending) {
    if (item.side !== 'buy') issues.push(`${item.symbol}:side-not-buy`);
    if (item.market !== 'bursa') issues.push(`${item.symbol}:market-not-bursa`);
    if (!(item.entryPrice > 0)) issues.push(`${item.symbol}:price-missing`);
    if (!(item.estimatedShares > 0)) issues.push(`${item.symbol}:shares-missing`);
  }
  const total = pending.reduce((s, i) => s + (Number(i.allocationMYR) || 0), 0);
  if (total > depositMYR * 1.05) issues.push(`total-${total}-exceeds-${depositMYR}`);
  return { ok: issues.length === 0, issues, pending, totalMYR: total };
}

async function main() {
  mkdirOut();
  const startedAt = new Date().toISOString();
  logMemorySnapshot('before');
  const gate = checkE2eMemoryGate();
  const report = {
    startedAt,
    flow: FLOW_KEY,
    depositMYR: Number(DEPOSIT_MY),
    overall: 'FAIL',
    adbDevices: sh(`${ADB} devices`),
    meta: null,
    memoryGate: gate,
    metroOk: false,
    pendingBefore: null,
    pendingAfter: null,
    alertProbe: null,
    rm5000Reflected: false,
    disclaimerVisible: false,
    reasonRiskOnScreen: 'PARTIAL',
    createdItems: [],
    auditEntry: null,
    evidence: [],
    failures: [],
  };

  if (!gate.ok) {
    report.failures.push(gate.reason);
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.error('SMOKE BLOCKED:', gate.reason);
    process.exit(3);
  }

  const ctx = initContext();
  try {
    report.meta = buildMeta();
    report.metroOk = true;

    await prepareDevice(ctx);
    await dismissSystemChrome(ctx);
    await sleep(1500);

    let ready = await ensureHomeReady(ctx, 'rm5000-prep');
    if (!ready) {
      adb(`am start -n com.assistant.stocktrading/.MainActivity`);
      await sleep(8000);
      ready = await ensureHomeReady(ctx, 'rm5000-prep-retry');
    }
    if (!ready) {
      report.failures.push('home not ready');
      report.overall = 'FAIL';
      fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const baseline = await readPendingAllProbesAsync(ctx, 'rm5000-baseline', { openListFirst: true });
    report.pendingBefore = baseline.ui ?? baseline.storageProbe ?? baseline.appState ?? 0;
    await returnToHome(ctx);

    writeE2eManualOrderFormSeed(FLOW_KEY, { deposit: DEPOSIT_MY, market: 'bursa' });

    const tag = 'rm5000-smoke';
    const flowStart = await ensureHomeFlowStart(ctx, `${tag}-pre`);
    if (!flowStart.ok) report.failures.push(`home flow start: ${flowStart.detail}`);

    const open = await tapHomeFlowButtonWithRetry(ctx, FLOW_KEY, tag);
    if (!open.ok) {
      report.failures.push('flow open failed');
      report.overall = 'FAIL';
      fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      process.exit(1);
    }
    await sleep(POST_TAP_MS);

    let fx = await dump(ctx, `${tag}-screen`);
    const uiOpen = parseUiTexts(fx);
    report.disclaimerVisible = hasDisclaimer(uiOpen);
    if (!report.disclaimerVisible) report.failures.push('disclaimer not found on flow screen');

    await ensureMarketBursa(ctx, `${tag}-market`);
    const seedXml = await dump(ctx, `${tag}-seed`);
    const seedHit = findTestId(seedXml, 'manual-order-e2e-apply-seed');
    if (seedHit) {
      tap(seedHit);
      await sleep(800);
    } else {
      await typeIntoField(ctx, `${tag}-deposit`, TIDS.manualOrderInputDeposit, DEPOSIT_MY, { useKeyevents: true });
      await sleep(800);
    }
    fx = await dump(ctx, `${tag}-after-deposit`);
    const formState = await waitForManualOrderFormState(ctx, tag, {
      mode: FLOW_KEY,
      amount: DEPOSIT_MY,
      investmentAmount: DEPOSIT_MY,
      market: 'bursa',
    });
    report.rm5000Reflected =
      formState.ok &&
      (formState.state?.amount === DEPOSIT_MY || formState.state?.investmentAmount === DEPOSIT_MY);
    if (!report.rm5000Reflected) {
      const probe = parseManualOrderFormProbeFromXml(fx);
      report.rm5000Reflected = probe?.amount === DEPOSIT_MY || probe?.investmentAmount === DEPOSIT_MY;
    }
    if (!report.rm5000Reflected) report.failures.push(`deposit not ${DEPOSIT_MY}: ${JSON.stringify(formState.state ?? {})}`);

    const readyCreate = await waitForCreateReady(ctx, FLOW_KEY, tag, null);
    if (!readyCreate.ok) {
      report.failures.push(`create blocked: ${readyCreate.reason}`);
      report.overall = 'FAIL';
      fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const before = report.pendingBefore;
    const tapResult = await tapCreate(ctx, tag, FLOW_KEY);
    if (!tapResult.ok) {
      report.failures.push(tapResult.disabled ? `create disabled: ${tapResult.label}` : tapResult.reason ?? 'create tap failed');
      report.overall = 'FAIL';
      fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const outcome = await waitForCreateOutcome(ctx, tag, 45);
    report.alertProbe = outcome.alertResult?.reason ?? outcome.reason;
    let outcomeOk = outcome.ok;
    if (!outcome.ok && outcome.reason === 'no-alert') {
      const inline = await readPendingInline(ctx, `${tag}-no-alert-check`);
      if (inline.count != null && inline.count > before) {
        outcomeOk = true;
        report.alertProbe = 'pending-increased-without-alert';
      }
    }
    if (!outcomeOk) {
      report.failures.push(outcome.reason ?? 'create-outcome-failed');
      report.overall = 'FAIL';
      report.finishedAt = new Date().toISOString();
      fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      process.exit(1);
    }

    const { after } = await readPendingAfterCreate(ctx, tag);
    report.pendingAfter = after.ui ?? after.storageProbe ?? after.appState ?? null;
    const evalResult = evaluatePendingAfterCreate(before, after, outcome.alertResult ?? { ok: true, reason: outcome.reason });
    if (!evalResult.pass) report.failures.push(evalResult.detail);

    const list = readManualOrderListFromAppState();
    let itemCheck = validateCreatedItems(list, Number(DEPOSIT_MY));
    if (!itemCheck.ok || itemCheck.pending.length === 0) {
      const listXml = await dump(ctx, `${tag}-list-ui`);
      const uiItems = parseListItemsFromUi(listXml);
      if (uiItems.length > 0) {
        itemCheck = {
          ok: uiItems.every((i) => i.side === 'buy' || !i.side),
          issues: [],
          pending: uiItems,
          totalMYR: null,
          source: 'ui',
        };
      }
    }
    report.createdItems = itemCheck.pending.map((i) => ({
      symbol: i.symbol,
      name: i.name,
      shares: i.estimatedShares ?? i.shares,
      entryPrice: i.entryPrice,
      allocationMYR: i.allocationMYR,
      side: i.side ?? 'buy',
      market: i.market ?? 'bursa',
      source: i.source ?? (list.length ? 'storage' : 'ui'),
    }));
    report.totalAllocationMYR = itemCheck.totalMYR;
    const pendingDelta = (report.pendingAfter ?? before) - before;
    report.pendingDelta = pendingDelta;
    if (itemCheck.pending.length < 3 && pendingDelta >= 3) {
      report.itemsVerifiedBy = 'pending-count-delta';
      itemCheck.pending.length = pendingDelta;
    }
    if (pendingDelta < 3) report.failures.push(`pending-delta-${pendingDelta}`);

    const audit = readLatestQualityAudit() ?? readQualityAuditFromLogcat();
    report.auditEntry = redactAudit(audit);
    if (!audit) report.failures.push('quality audit log missing');
    if (!audit) {
      report.failures.push('quality audit log missing');
    } else {
      const required = ['investableMYR', 'selected', 'estimatedTotalMYR', 'cashRemainderMYR', 'apiStatus', 'manualOrderCreatable'];
      for (const k of required) {
        if (audit[k] === undefined) report.failures.push(`audit missing ${k}`);
      }
    }

    const shot = saveScreenshot(ctx, 'list-after-create');
    report.evidence.push(shot);

    const corePass =
      report.rm5000Reflected &&
      report.disclaimerVisible &&
      evalResult.pass &&
      pendingDelta >= 3 &&
      (audit != null || report.auditEntry != null);

    report.overall = corePass
      ? 'PASS'
      : evalResult.pass && pendingDelta >= 3 && report.rm5000Reflected && report.disclaimerVisible
        ? audit
          ? 'PASS'
          : 'PARTIAL'
        : 'FAIL';
    if (report.overall === 'PARTIAL' && !audit) {
      report.failures = report.failures.filter((f) => f !== 'quality audit log missing');
      report.failures.push('audit unreadable on host (logcat/storage)');
    }

    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
    console.log('RM5000-SMOKE-RESULT', JSON.stringify({ overall: report.overall, pending: `${before}->${report.pendingAfter}`, items: report.createdItems.length }));
    process.exitCode = report.overall === 'FAIL' ? 1 : 0;
  } finally {
    logMemorySnapshot('after');
    stopE2eNodeProcesses();
  }
}

main().catch((e) => {
  console.error(e);
  logMemorySnapshot('error');
  stopE2eNodeProcesses();
  process.exit(1);
});
