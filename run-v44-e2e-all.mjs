#!/usr/bin/env node
/**
 * Device Verify v44 unified runner.
 * --rerun4       A → B → C only (create→list priority; modes separated)
 * --rerun5       rerun4-retry fixes + create-error logging + pending fallbacks
 * --rerun4-retry same as rerun4 + adb preflight + RETRY report + tag rerun4-retry
 * --rerun3  legacy full A → B → D → C → E
 */
process.env.PYTHONIOENCODING = 'utf-8';

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import {
  OUT,
  FLOWS,
  buildMeta,
  gitHash,
  resolveGit,
  ensureMetroLink,
  writeUtf8File,
  adb,
  PKG,
} from './_deviceVerifyE2eCommon.mjs';
import { checkE2eMemoryGate, logMemorySnapshot, stopE2eNodeProcesses } from './_deviceVerifyMemory.mjs';

const isRerun5 = process.argv.includes('--rerun5');
const isRerun4Retry = process.argv.includes('--rerun4-retry');
const isRerun4 = process.argv.includes('--rerun4') || isRerun4Retry || isRerun5;
const isRerun3 = process.argv.includes('--rerun3');
const RUN_TAG = isRerun5 ? 'rerun5' : isRerun4Retry ? 'rerun4-retry' : isRerun4 ? 'rerun4' : isRerun3 ? 'rerun3' : 'rerun2';

const REPORT = path.join(
  'docs',
  'review',
  isRerun5
    ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN5_REPORT.md'
    : isRerun4Retry
      ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN4_RETRY_REPORT.md'
      : isRerun4
        ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN4_REPORT.md'
        : isRerun3
          ? 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN3_REPORT.md'
          : 'DEVICE_VERIFY_V44_E2E_FINAL_RERUN2_REPORT.md',
);

const CORE_STEPS = [
  { script: 'run-v44-e2e-a-onboarding.mjs', step: 'a' },
  { script: 'run-v44-e2e-b-home-buttons.mjs', step: 'b' },
  { script: 'run-v44-e2e-c-create-list.mjs', step: 'c' },
];

const LEGACY_STEPS = [
  { script: 'run-v44-e2e-a-onboarding.mjs', step: 'a-position' },
  { script: 'run-v44-e2e-b-home-buttons.mjs', step: 'b' },
  { script: 'run-v44-e2e-d-ux-modes.mjs', step: 'd' },
  { script: 'run-v44-e2e-c-create-list.mjs', step: 'c' },
  { script: 'run-v44-e2e-e-trust.mjs', step: 'e' },
];

const STEPS = isRerun4 ? CORE_STEPS : LEGACY_STEPS.map((s, i) => ({ ...s, step: ['a', 'b', 'd', 'c', 'e'][i] }));
const MERGED_JSON = `results-${RUN_TAG}-merged.json`;
const SERIAL = process.env.ADB_SERIAL || 'FYRWXSNNAIOR9DCM';

function preflightAdInput() {
  const checks = [];
  try {
    execSync('adb kill-server', { stdio: 'pipe', encoding: 'utf8' });
    execSync('adb start-server', { stdio: 'pipe', encoding: 'utf8' });
    checks.push('adb kill-server / start-server: OK');
  } catch (e) {
    checks.push(`adb server restart: ${e.message}`);
    return { ok: false, checks };
  }
  let devices = '';
  for (let i = 0; i < 12; i++) {
    try {
      devices = execSync('adb devices', { encoding: 'utf8' });
      if (devices.includes(`${SERIAL}\tdevice`)) break;
    } catch (e) {
      checks.push(`adb devices: ${e.message}`);
      return { ok: false, checks };
    }
    if (i < 11) {
      try {
        execSync('adb wait-for-device', { stdio: 'pipe', encoding: 'utf8', timeout: 8000 });
      } catch {}
      execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 1"', { stdio: 'pipe', encoding: 'utf8' });
    }
  }
  if (!devices.includes(`${SERIAL}\tdevice`)) {
    checks.push(`device ${SERIAL} not in list:\n${devices}`);
    return { ok: false, checks };
  }
  checks.push(`adb devices: ${SERIAL} device`);
  try {
    execSync(`adb -s ${SERIAL} shell input keyevent 3`, { stdio: 'pipe', encoding: 'utf8' });
    checks.push('input keyevent 3: OK');
  } catch (e) {
    checks.push(`input keyevent 3: FAIL (${e.message})`);
    return { ok: false, checks };
  }
  try {
    execSync(`adb -s ${SERIAL} shell input tap 101 2541`, { stdio: 'pipe', encoding: 'utf8' });
    checks.push('input tap 101 2541: OK');
  } catch (e) {
    checks.push(`input tap 101 2541: FAIL (${e.message})`);
    return { ok: false, checks };
  }
  return { ok: true, checks };
}

const DEPRECATED_IDS = new Set([
  'test-c-live-mode',
  'test-c-practice-nav',
  'test-c-live-analysis-required',
]);

function resultFile(step) {
  return path.join(OUT, `results-${RUN_TAG}-${step}.json`);
}

function runStep(script) {
  console.log('\n==========', script, `(tag=${RUN_TAG})`, '==========\n');
  const env = { ...process.env, E2E_RUN_TAG: RUN_TAG, PYTHONIOENCODING: 'utf-8' };
  if (isRerun5 || isRerun4Retry) env.SKIP_PM_CLEAR = '1';
  try {
    execSync(`node ${script}`, {
      stdio: 'inherit',
      encoding: 'utf8',
      env,
    });
    return true;
  } catch (e) {
    console.error(`STEP FAILED: ${script}`, e.message);
    return false;
  }
}

function clearRunTagResults() {
  for (const step of ['a', 'b', 'c', 'd', 'e']) {
    const p = resultFile(step);
    if (fs.existsSync(p)) fs.unlinkSync(p);
  }
  const merged = path.join(OUT, MERGED_JSON);
  if (fs.existsSync(merged)) fs.unlinkSync(merged);
}

function mergeResults() {
  const all = [];
  let meta = buildMeta();
  const steps = isRerun4 ? ['a', 'b', 'c'] : ['a', 'b', 'd', 'c', 'e'];
  for (const step of steps) {
    const p = resultFile(step);
    if (!fs.existsSync(p)) continue;
    const data = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (data.meta) meta = { ...meta, ...data.meta };
    for (const r of data.results || []) {
      if (DEPRECATED_IDS.has(r.id)) continue;
      all.push(r);
    }
  }
  writeUtf8File(path.join(OUT, MERGED_JSON), `${JSON.stringify({ meta, results: all }, null, 2)}\n`);
  return { meta, results: all };
}

function writeReport(meta, results, pushInfo) {
  const pass = results.filter((r) => r.status === 'PASS').length;
  const partial = results.filter((r) => r.status === 'PARTIAL').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const overall = fail === 0 && partial === 0 ? 'PASS' : pass > 0 ? 'PARTIAL' : 'FAIL';

  const pick = (id) => results.find((r) => r.id === id);
  const flowRow = (key, label) => {
    const op = pick(`test-c-flow-${key}-open`);
    const e2e = pick(`test-c-e2e-${key}`);
    return `| ${label} | ${op?.status ?? 'N/A'} | ${e2e?.status ?? 'N/A'} | ${e2e?.detail ?? 'N/A'} |`;
  };

  const reportTitle = isRerun5
    ? '# Device Verify v44 - E2E Final Rerun 5 Report'
    : isRerun4Retry
      ? '# Device Verify v44 - E2E Final Rerun 4 Retry Report'
      : isRerun4
        ? '# Device Verify v44 - E2E Final Rerun 4 Report'
        : isRerun3
          ? '# Device Verify v44 - E2E Final Rerun 3 Report'
          : '# Device Verify v44 - E2E Final Rerun 2 Report';

  const lines = [
    reportTitle,
    '',
    `- **Overall**: **${overall}**`,
    `- **PASS / PARTIAL / FAIL**: ${pass} / ${partial} / ${fail}`,
    `- **Device**: ${meta.model} (${meta.serial})`,
    `- **versionCode**: ${meta.versionCode}`,
    `- **Timestamp**: ${meta.timestamp}`,
    `- **Git commit**: \`${gitHash()}\``,
    `- **Push**: ${pushInfo}`,
    '',
  ];

  if (meta.adbPreflight?.length) {
    lines.push('## ADB preflight', ...meta.adbPreflight.map((c) => `- ${c}`), '');
  }

  if (pick('test-a-fatal')) {
    lines.push(
      '## Run infrastructure',
      '- Test A aborted mid-run: adb `input` service unavailable (`cmd: Can\'t find service: input`) — USB disconnect suspected.',
      '- B/C did not run. Re-run when device is stable: `node run-v44-e2e-all.mjs --rerun4`',
      '',
    );
  }

  lines.push(
    '## E2E script fixes (rerun4)',
    '- Removed `enableLiveAnalysisMode` and `test-c-live-mode` from all runners.',
    '- Removed `settings-nav-practice-mode` lookup — no longer fails create→list in practice mode.',
    '- Merge uses isolated `results-rerun4-{a,b,c}.json` (stale rerun3 live-mode rows excluded).',
    '- Standard/Pro/Trust moved to `run-v44-e2e-modes.mjs`.',
    '',
    '## Manual order list policy',
    '- **Live analysis required**: No - lists are for Rakuten manual hand-entry only; practice mode may create lists.',
    `- **Practice mode create allowed**: ${pick('test-c-app-mode')?.status === 'PASS' ? 'Yes (E2E confirmed)' : 'See Test C results'}`,
    '',
    '## Commands',
    '```powershell',
    'chcp 65001',
    "$env:PYTHONIOENCODING='utf-8'",
    "$env:E2E_RUN_TAG='rerun5'",
    "$env:SKIP_PM_CLEAR='1'",
    '. .\\scripts\\git-env.ps1',
    'npm run start:clear',
    'adb -s FYRWXSNNAIOR9DCM reverse tcp:8081 tcp:8081',
    'node run-v44-e2e-all.mjs --rerun5',
    '```',
    '',
    '## adb devices',
    '```',
    meta.adbDevices || '',
    '```',
    '',
    '## Language / onboarding / home',
    '| Check | Status | Detail |',
    '|-------|--------|--------|',
    ...['test-a-language-ja', 'test-a-onboarding-dismiss', 'test-b-four-buttons', 'test-b-home-stability'].map((id) => {
      const r = pick(id);
      return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
    }).filter(Boolean),
    '',
    '## Test C - create to list (4 flows)',
    '| Flow | Open | E2E | Pending |',
    '|------|------|-----|---------|',
    ...FLOWS.map((f) => flowRow(f.key, f.home)),
    '',
    `**Pending baseline**: ${pick('test-c-pending-baseline')?.detail ?? 'N/A'}`,
    `**App mode policy**: ${pick('test-c-app-mode')?.detail ?? 'N/A'}`,
    '',
    '## Create error alerts (if any)',
    ...FLOWS.map((f) => {
      const a = pick(`test-c-create-alert-${f.key}`);
      const e2e = pick(`test-c-e2e-${f.key}`);
      if (a?.status === 'FAIL') return `- **${f.key}**: ${a.detail}`;
      if (e2e?.status === 'FAIL' && e2e.detail.includes('create-error-alert')) return `- **${f.key}**: ${e2e.detail}`;
      return `- **${f.key}**: none (alert=${a?.detail ?? 'N/A'})`;
    }),
    '',
    '## Pending probes (after create)',
    ...FLOWS.map((f) => {
      const before = pick(`test-c-pending-before-${f.key}`);
      const p = pick(`test-c-pending-after-${f.key}`);
      return `- **${f.key}**: before=${before?.detail ?? 'N/A'} | after=${p?.detail ?? pick(`test-c-e2e-${f.key}`)?.detail ?? 'N/A'}`;
    }),
    '',
    '## NotificationShade handling',
    ...FLOWS.map((f) => {
      const s = pick(`test-c-shade-${f.key}`);
      return `- **${f.key}**: ${s?.detail ?? 'N/A'} (${s?.status ?? 'N/A'})`;
    }),
    '',
    '## Practice mode save guarantee (code review)',
    '- `ManualOrderFlowScreen`: create blocked only by `readOnlyBlockedMessage`, not practice mode',
    '- `addManualBuyOrders` (`useAppPortfolioActions.ts`): no practice guard on list append',
    '- `manualOrderConfirmation`: practice blocks **confirm/execute**, not list **create**',
    '',
  );

  if (isRerun4) {
    lines.push(
      '## Standard / Pro / Trust mode checks',
      '- **Executed in this run**: No',
      '- **Reason**: Mode switching (Standard / Pro / Beginner / Trust) is separated into `run-v44-e2e-modes.mjs` so create→list 4 flows can pass first without UX-mode navigation blocking Test C.',
      '- **Run separately**: `node run-v44-e2e-modes.mjs`',
      '',
    );
  } else {
    lines.push(
      '## Test D — UX modes',
      '| Mode | Switch | 4 buttons | Flow open |',
      '|------|--------|-----------|-----------|',
      ...['test-d-beginner', 'test-d-standard', 'test-d-pro'].map((prefix) => {
        const sw = pick(`${prefix}-mode-switch`);
        const bt = pick(`${prefix}-four-buttons`);
        const fo = pick(`${prefix}-flow-open`);
        const label = prefix.replace('test-d-', '');
        return `| ${label} | ${sw?.status ?? '—'} | ${bt?.detail ?? bt?.status ?? '—'} | ${fo?.status ?? '—'} |`;
      }),
      '',
      '## Test E — Trust',
      '| Check | Status | Detail |',
      '|-------|--------|--------|',
      ...['test-e-trust-mode-switch', 'test-e-four-buttons', 'test-e-flow-open'].map((id) => {
        const r = pick(id);
        return r ? `| ${id} | ${r.status} | ${r.detail} |` : '';
      }).filter(Boolean),
      '',
    );
  }

  lines.push(
    '## UTF-8 / mojibake fix',
    '- Markdown: UTF-8 with BOM via writeUtf8File',
    '- Node: PYTHONIOENCODING=utf-8',
    '- PowerShell: chcp 65001 before run; avoid Tee-Object -Encoding on older PS',
    '- Report uses ASCII hyphen instead of em-dash for console compatibility',
    '',
    '## Evidence',
    '- Screenshots/XML: `docs/review/device-verify-v44/`',
    `- Failure artifacts: \`docs/review/device-verify-v44/${RUN_TAG}-artifacts/\``,
    `- Merged JSON: \`docs/review/device-verify-v44/${MERGED_JSON}\``,
    '',
    '## AAB',
    '- **Created**: No - Build Credit saving; AAB not built this run',
    '',
    '## Git manual',
    '```powershell',
    '. .\\scripts\\git-env.ps1',
    'git --version',
    'git push origin cursor/top3-maxdd-capital-audit',
    '```',
  );

  if (fail > 0 || partial > 0) {
    lines.push('', '## Remaining failures');
    for (const r of results.filter((x) => x.status !== 'PASS')) {
      lines.push(`- **${r.id}** (${r.status}): ${r.detail}`);
    }
  }

  writeUtf8File(REPORT, `\ufeff${lines.join('\n')}\n`);
  return { overall, pass, partial, fail };
}

function isGitIgnored(relPath) {
  const git = resolveGit();
  if (!git) return false;
  try {
    execSync(`"${git}" check-ignore -q "${relPath.replace(/\\/g, '/')}"`, { stdio: 'pipe', encoding: 'utf8' });
    return true;
  } catch {
    return false;
  }
}

function gitAddSafe(git, paths) {
  for (const p of paths) {
    const norm = p.replace(/\\/g, '/');
    if (!fs.existsSync(p)) continue;
    if (isGitIgnored(norm)) {
      console.log('git add skip (ignored):', norm);
      continue;
    }
    execSync(`"${git}" add "${norm}"`, { stdio: 'inherit', encoding: 'utf8' });
  }
}

function collectGitAddPaths() {
  const paths = [
    '_deviceVerifyE2eCommon.mjs',
    '_deviceVerifyAdb.mjs',
    'src/constants/deviceVerifyTestIds.ts',
    'src/screens/ManualOrderFlowScreen.tsx',
    'src/components/MarketPicker.tsx',
  ];
  for (const f of fs.readdirSync('.')) {
    if (f.startsWith('run-v44-e2e') && f.endsWith('.mjs')) paths.push(f);
  }
  if (fs.existsSync(REPORT)) paths.push(REPORT);
  return [...new Set(paths)];
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  let metaPreflight = [];
  if (process.argv.includes('--merge-only')) {
    process.env.E2E_RUN_TAG = RUN_TAG;
    const { meta, results } = mergeResults();
    const summary = writeReport(meta, results, 'merge-only (no push)');
    console.log('MERGE DONE', summary);
    return;
  }

  stopE2eNodeProcesses();
  logMemorySnapshot('before-bulk');
  const gate = checkE2eMemoryGate();
  if (!gate.ok) {
    console.error('E2E BLOCKED (OOM prevention):', gate.reason);
    process.exit(3);
  }
  if (isRerun5 && !process.env.E2E_ALLOW_BULK && !process.argv.includes('--force-bulk')) {
    console.error(
      'Bulk run-v44-e2e-all is disabled for OOM safety. Run one flow at a time:\n' +
        '  node run-v44-e2e-flow.mjs concierge_full\n' +
        '  node run-v44-e2e-flow.mjs manual_full\n' +
        '  node run-v44-e2e-flow.mjs concierge_symbol\n' +
        '  node run-v44-e2e-flow.mjs concierge_quantity\n' +
        'Or set E2E_ALLOW_BULK=1 / --force-bulk to override (max once per session).',
    );
    process.exit(4);
  }

  if (isRerun5) {
    clearRunTagResults();
    console.log('Cleared prior results for tag rerun5 (fresh merge)');
  }

  const metroOk = await ensureMetroLink();
  if (!metroOk) {
    console.error('FATAL: Start Metro first (npm run start:clear)');
    process.exit(2);
  }

  if (isRerun4Retry || isRerun5) {
    const pf = preflightAdInput();
    metaPreflight = pf.checks;
    console.log('ADB preflight:', pf.ok ? 'OK' : 'FAIL');
    for (const c of pf.checks) console.log(' ', c);
    if (!pf.ok) {
      const { meta, results } = mergeResults();
      writeReport({ ...meta, adbPreflight: pf.checks }, results, 'aborted: adb preflight failed');
      process.exit(2);
    }
  }

  adb(`am start -n ${PKG}/.MainActivity`);
  await new Promise((r) => setTimeout(r, isRerun5 || isRerun4Retry ? 8000 : 2000));

  for (const step of STEPS) {
    runStep(step.script);
  }

  const { meta, results } = mergeResults();
  let pushStatus = 'not attempted';
  writeReport({ ...meta, adbPreflight: metaPreflight }, results, pushStatus);

  const git = resolveGit();
  if (git) {
    try {
      gitAddSafe(git, collectGitAddPaths());
      const commitMsg = isRerun5
        ? 'fix: Device Verify v44 E2E rerun5 create-alert probe and pending fallbacks'
        : 'fix: Device Verify v44 E2E rerun4-retry pending probe after create';
      execSync(`"${git}" commit -m "${commitMsg}"`, { stdio: 'inherit', encoding: 'utf8' });
      try {
        execSync(`"${git}" push origin cursor/top3-maxdd-capital-audit`, { stdio: 'inherit', encoding: 'utf8' });
        pushStatus = `SUCCESS (${gitHash()})`;
      } catch (e) {
        pushStatus = `push failed: ${e.message}`;
      }
    } catch (e) {
      pushStatus = `commit skipped or failed: ${e.message}`;
    }
  }

  writeReport({ ...meta, adbPreflight: metaPreflight }, results, pushStatus);
  logMemorySnapshot('after-bulk');
  stopE2eNodeProcesses();
  const pass = results.filter((r) => r.status === 'PASS').length;
  const fail = results.filter((r) => r.status === 'FAIL').length;
  const summary = { pass, fail, overall: fail === 0 ? 'PASS' : pass > 0 ? 'PARTIAL' : 'FAIL' };
  console.log('DONE', summary);
  console.log('Report:', REPORT, 'tag=', RUN_TAG);
  const fails = results.filter((r) => r.status === 'FAIL').length;
  if (fails > 0 && !process.argv.includes('--allow-partial')) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
