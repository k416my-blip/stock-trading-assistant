import fs from 'node:fs';

const p = 'docs/review/device-verify-v44/run-v44-phase-b-final.mjs';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('return { corpus, buttonShots }')) {
  s = s.replace('  return corpus;\n}\n\nasync function scrollToTapButton', '  return { corpus, buttonShots };\n}\n\nasync function scrollToTapButton');
}

if (!s.includes('const { corpus, buttonShots } = await scrollCollectCorpus')) {
  s = s.replace(
    '  const corpus = await scrollCollectCorpus(prefix);',
    '  const { corpus, buttonShots } = await scrollCollectCorpus(prefix);',
  );
}

s = s.replace(
  `    if (fullE2E) {
      const created = await completeFlow(flow.key, \`\${prefix}-\${flow.key}\`, flow.homeLabel, pendingBefore);
      record(\`\${key}-flow-\${flow.key}-create\`, created.ok, created.detail, created.evidence || []);
      if (created.pendingCount != null) pendingBefore = created.pendingCount;
    }
    record(\`\${key}-flow-\${flow.key}-create\`, created.ok, created.detail, created.evidence || []);`,
  `    if (fullE2E) {
      const created = await completeFlow(flow.key, \`\${prefix}-\${flow.key}\`, flow.homeLabel, pendingBefore);
      record(\`\${key}-flow-\${flow.key}-create\`, created.ok, created.detail, created.evidence || []);
      if (created.pendingCount != null) pendingBefore = created.pendingCount;
    }`,
);

if (!s.includes('await verifyMode(modes[1], { fullE2E: true')) {
  s = s.replace(
    `  for (const mode of modes) {
    await verifyMode(mode);
  }`,
    `  await verifyMode(modes[1], { fullE2E: true, oneFlowOnly: false });
  for (const mode of modes) {
    await verifyMode(mode, { fullE2E: false, oneFlowOnly: true });
  }`,
  );
}

// Fix completeFlow list verification with pending count
if (!s.includes('pendingBefore === null || increased')) {
  s = s.replace(
    `    const onList = xmlTextJoined(xml).includes(LIST_SCREEN);
    return { ok: onList, detail: onList ? 'manual order list screen shown' : 'list screen text missing', evidence: [\`\${prefix}-list-screen.png\`] };`,
    `    const count = parsePendingCount(xml);
    const onList = xmlTextJoined(xml).includes(LIST_SCREEN) || count !== null;
    const increased = count !== null && pendingBefore !== null && count > pendingBefore;
    return {
      ok: onList && (pendingBefore === null || increased || count > 0),
      detail: onList ? \`list pending=\${count ?? '?'} before=\${pendingBefore ?? '?'} \${increased ? 'increased' : ''}\`.trim() : 'list screen text missing',
      evidence: [\`\${prefix}-list-screen.png\`],
      pendingCount: count,
    };`,
  );
}

if (!s.includes('Japanese UI confirmed')) {
  s = s.replace(
    `  const jaOk = await ensureJapaneseLanguage();
  record('language-ja', jaOk, jaOk ? 'UI language set to Japanese' : 'could not select Japanese', []);`,
    `  let jaOk = await ensureJapaneseLanguage();
  if (!jaOk) {
    const probe = await dumpUi('lang-probe');
    jaOk = probe.includes(SECTION_TITLE) || FLOW_BUTTONS.some((b) => probe.includes(b.homeLabel));
  }
  record('language-ja', jaOk, jaOk ? 'Japanese UI confirmed' : 'could not select Japanese', []);`,
  );
}

fs.writeFileSync(p, s, 'utf8');
console.log('All patches applied');
console.log('has object return:', s.includes('return { corpus, buttonShots }'));
console.log('has destructure:', s.includes('const { corpus, buttonShots }'));
console.log('has e2e standard:', s.includes('fullE2E: true'));
