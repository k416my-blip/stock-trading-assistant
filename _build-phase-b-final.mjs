import fs from 'node:fs';
import path from 'node:path';

const srcPath = path.join('docs', 'review', 'device-verify-v44', 'run-v44-phase-b.mjs');
const outPath = path.join('docs', 'review', 'device-verify-v44', 'run-v44-phase-b-final.mjs');
let s = fs.readFileSync(srcPath, 'utf8');

const oldDismiss = /async function dismissDialogs\(prefix\) \{[\s\S]*?\n\}/;
const newDismiss = `async function dismissDialogs(prefix) {
  const dismissLabels = [
    jaHome.onboarding.skip,
    jaHome.proactive.skip,
    jaHome.proactive.close,
    jaHome.trust.cancel,
    jaHome.trust.ok,
    'OK',
    'Allow',
    'While using the app',
    'While using',
    '\\u8a31\\u53ef',
    '\\u9589\\u3058\\u308b',
    '\\u30ad\\u30e3\\u30f3\\u30bb\\u30eb',
    'Reload',
  ];
  for (let i = 0; i < 8; i++) {
    const xml = await dumpUi(\`\${prefix}-dismiss-\${i}\`);
    if (!xml) break;
    const btn = findNodes(xml, (l) => dismissLabels.includes(l) || l.includes('\\u30ab\\u30e1\\u30e9'));
    if (!btn[0]) break;
    tap(btn[0]);
    await sleep(900);
  }
}`;
if (!oldDismiss.test(s)) throw new Error('dismiss block not found');
s = s.replace(oldDismiss, newDismiss);

const oldFill = /async function fillFlowInputs\(modeKey\) \{[\s\S]*?\n\}/;
const newFill = `function findEditTexts(xml) {
  const out = [];
  for (const chunk of xml.split('<node')) {
    if (!chunk.includes('android.widget.EditText')) continue;
    const b = chunk.match(/bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"/);
    if (b) out.push({ cx: Math.floor((+b[1] + +b[3]) / 2), cy: Math.floor((+b[2] + +b[4]) / 2) });
  }
  return out.sort((a, b) => a.cy - b.cy);
}

async function tapEdit(index, text, tag) {
  const xml = await dumpUi(tag);
  const edits = findEditTexts(xml);
  const field = edits[index];
  if (!field) return false;
  adbShell(\`input tap \${field.cx} \${field.cy}\`);
  await sleep(400);
  for (let k = 0; k < 8; k++) adbShell('input keyevent 67');
  await sleep(200);
  adbShell(\`input text \${text}\`);
  await sleep(400);
  return true;
}

async function fillFlowInputs(modeKey) {
  await sleep(800);
  if (modeKey === 'concierge_full') {
    await tapEdit(0, '2000', \`fill-\${modeKey}-deposit\`);
  } else if (modeKey === 'manual_full') {
    await tapEdit(0, MANUAL_SYMBOL, \`fill-\${modeKey}-sym\`);
    await tapEdit(1, '100', \`fill-\${modeKey}-sh\`);
  } else if (modeKey === 'concierge_symbol') {
    await tapEdit(0, '2000', \`fill-\${modeKey}-dep\`);
  } else if (modeKey === 'concierge_quantity') {
    await tapEdit(0, MANUAL_SYMBOL, \`fill-\${modeKey}-sym\`);
    await tapEdit(1, '2000', \`fill-\${modeKey}-dep\`);
  }
}`;
s = s.replace(oldFill, newFill);

const pendingHelper = `
function parsePendingCount(xml) {
  const joined = xmlTextJoined(xml);
  const m = joined.match(/\\u672a\\u5b8c\\u4e86[\\uff08(](\\d+)\\u4ef6[\\uff09)]/);
  return m ? Number(m[1]) : null;
}

async function openManualOrderListFromPortfolio() {
  adbShell('input tap 350 2486');
  await sleep(2500);
  for (let i = 0; i < 20; i++) {
    const xml = await dumpUi(\`portfolio-scroll-\${i}\`);
    const btn = findNodes(xml, (l) => l === LIST_SCREEN || l.includes('\\u624b\\u52d5\\u6ce8\\u6587\\u30ea\\u30b9\\u30c8'));
    if (btn[0]) {
      tap(btn[0]);
      await sleep(POST_TAP_MS);
      return true;
    }
    adbShell('input swipe 540 1900 540 600 350');
    await sleep(500);
  }
  return false;
}

async function readPendingCount(tag) {
  const xml = await dumpUi(tag);
  screenshot(tag);
  return parsePendingCount(xml);
}
`;
s = s.replace(
  'async function completeFlow(modeKey, prefix, homeLabel) {',
  pendingHelper + '\nasync function completeFlow(modeKey, prefix, homeLabel, pendingBefore) {',
);

s = s.replace(
  `    const onList = xmlTextJoined(xml).includes(LIST_SCREEN);
    return { ok: onList, detail: onList ? 'manual order list screen shown' : 'list screen text missing', evidence: [\`\${prefix}-list-screen.png\`] };`,
  `    const count = parsePendingCount(xml);
    const onList = xmlTextJoined(xml).includes(LIST_SCREEN) || count !== null;
    const increased = count !== null && pendingBefore !== null && count > pendingBefore;
    return {
      ok: onList && (pendingBefore === null || increased || count > 0),
      detail: onList
        ? \`list pending=\${count ?? '?'} before=\${pendingBefore ?? '?'} \${increased ? 'increased' : ''}\`.trim()
        : 'list screen text missing',
      evidence: [\`\${prefix}-list-screen.png\`],
      pendingCount: count,
    };`,
);

s = s.replace('async function scrollCollectCorpus(prefix) {', 'async function scrollCollectCorpus(prefix, shotEvery = 4) {\n  const buttonShots = [];');
s = s.replace(
  '    if (xml) for (const t of xmlTexts(xml)) corpus.add(t);',
  `    if (xml) {
      for (const t of xmlTexts(xml)) corpus.add(t);
      const foundBtn = FLOW_BUTTONS.filter((b) => xml.includes(b.homeLabel));
      if (foundBtn.length > 0 && (i % shotEvery === 0 || foundBtn.length === 4)) {
        const shot = \`\${prefix}-scroll-shot-\${i}-found\${foundBtn.length}\`;
        screenshot(shot);
        buttonShots.push(\`\${shot}.png\`);
      }
    }`,
);
s = s.replace(
  "  fs.writeFileSync(path.join(OUT, `${prefix}-scroll-corpus.txt`), text, 'utf8');\n  return corpus;",
  "  fs.writeFileSync(path.join(OUT, `${prefix}-scroll-corpus.txt`), text, 'utf8');\n  return { corpus, buttonShots };",
);
s = s.replace(
  '  const corpus = await scrollCollectCorpus(prefix);\n  const found = FLOW_BUTTONS.filter((b) => corpus.has(b.homeLabel));',
  '  const { corpus, buttonShots } = await scrollCollectCorpus(prefix);\n  const found = FLOW_BUTTONS.filter((b) => corpus.has(b.homeLabel));',
);
s = s.replace('    [`${prefix}-scroll-corpus.txt`],', '    [`${prefix}-scroll-corpus.txt`, ...buttonShots],');

s = s.replace(
  'async function verifyMode(modeCfg) {',
  'async function verifyMode(modeCfg, options = {}) {\n  const { fullE2E = false, oneFlowOnly = false } = options;',
);
s = s.replace(
  '  for (const flow of FLOW_BUTTONS) {',
  `  let pendingBefore = null;
  if (fullE2E) {
    await openManualOrderListFromPortfolio();
    pendingBefore = (await readPendingCount(\`\${prefix}-pending-before\`)) ?? 0;
    adbShell('input keyevent 4');
    await sleep(1000);
    await goHomeTab();
  }
  const flowsToRun = oneFlowOnly ? [FLOW_BUTTONS[0]] : FLOW_BUTTONS;
  for (const flow of flowsToRun) {`,
);
s = s.replace(
  '    const created = await completeFlow(flow.key, `${prefix}-${flow.key}`, flow.homeLabel);',
  `    if (fullE2E) {
      const created = await completeFlow(flow.key, \`\${prefix}-\${flow.key}\`, flow.homeLabel, pendingBefore);
      record(\`\${key}-flow-\${flow.key}-create\`, created.ok, created.detail, created.evidence || []);
      if (created.pendingCount != null) pendingBefore = created.pendingCount;
    }`,
);
s = s.replace(
  `  for (const mode of modes) {
    await verifyMode(mode);
  }`,
  `  await verifyMode(modes[1], { fullE2E: true, oneFlowOnly: false });
  for (const mode of modes) {
    await verifyMode(mode, { fullE2E: false, oneFlowOnly: true });
  }`,
);

const reportFn = `
async function writeReport(meta, results) {
  const overall = results.every((r) => r.status === 'PASS')
    ? 'PASS'
    : results.some((r) => r.status === 'PASS' || r.status === 'PARTIAL')
      ? 'PARTIAL'
      : 'FAIL';
  const lines = [
    '# Device Verify v44 — Phase B Final Report',
    '',
    \`- **Overall**: \${overall}\`,
    \`- **Device**: \${meta.deviceModel} (\${meta.serial})\`,
    \`- **versionCode**: \${meta.versionCode}\`,
    \`- **Timestamp**: \${meta.timestamp}\`,
    \`- **Script**: \\\`docs/review/device-verify-v44/run-v44-phase-b-final.mjs\\\`\`,
    '',
    '## Results',
    '',
    '| ID | Status | Detail |',
    '|----|--------|--------|',
    ...results.map((r) => \`| \${r.id} | \${r.status} | \${String(r.detail).replace(/\\|/g, '\\\\|')} |\`),
    '',
    '## UTF-8 encoding fixes',
    '- dismissDialogs uses i18n JSON strings',
    '- Report saved as UTF-8 Markdown',
    '- Shell: chcp 65001; PYTHONIOENCODING=utf-8',
    '',
    '## Git / AAB',
    '- See commit hash in CI log after push',
    '- **AAB created**: No — Build Credit savings',
    '',
    '## Evidence',
    '- docs/review/device-verify-v44/results-phase-b-final.json',
    '- docs/review/device-verify-v44/phase-b-*-scroll-shot-*.png',
  ];
  const reportPath = path.join('docs', 'review', 'DEVICE_VERIFY_V44_PHASE_B_FINAL_REPORT.md');
  fs.writeFileSync(reportPath, lines.join('\\n'), 'utf8');
  console.log('WROTE', reportPath);
}
`;
s = s.replace('async function main() {', reportFn + '\nasync function main() {');
s = s.replace("const outPath = path.join(OUT, 'results-phase-b.json');", "const outPath = path.join(OUT, 'results-phase-b-final.json');");
s = s.replace("console.log('WROTE', outPath);", "console.log('WROTE', outPath);\n  await writeReport(meta, results);");

s = `#!/usr/bin/env node\nprocess.env.PYTHONIOENCODING = 'utf-8';\n` + s;

fs.writeFileSync(outPath, s, 'utf8');
console.log('Built', outPath, s.length, 'bytes');
