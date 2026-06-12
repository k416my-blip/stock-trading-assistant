/**
 * Phase12.5 graceful INVALID exit — checkpoint + JSON/Markdown reason artifacts.
 */
import fs from 'node:fs';
import path from 'node:path';

export const INVALID_REASON_JSON = 'phase12-5-invalid-reason.json';
export const INVALID_REASON_MD = 'PHASE12_5_INVALID_REASON_SUMMARY.md';

export function buildInvalidReasonPayload(state) {
  return {
    stopReason: state.stopReason ?? null,
    runtimeMode: state.runtimeMode ?? null,
    endedAt: state.endedAt ?? new Date().toISOString(),
    startedAt: state.startedAt ?? null,
    baselineAppPid: state.baselineAppPid ?? null,
    metroDownAt: state.metroDownAt ?? null,
    metroPid: state.metroPid ?? null,
    lastMetroCheck: state.lastMetroCheck ?? null,
    metroCheckDetails: state.metroCheckDetails ?? null,
    bundleErrorAt: state.bundleErrorAt ?? null,
    bundleMatchingLine: state.bundleMatchingLine ?? null,
    bundleSourceFile: state.bundleSourceFile ?? null,
    watchDeadAt: state.watchDeadAt ?? null,
    previousPid: state.previousPid ?? null,
    currentPid: state.currentPid ?? null,
    pidLostEvents: state.pidLostEvents ?? 0,
    pidChangedEvents: state.pidChangedEvents ?? 0,
    detectorErrors: state.detectorErrors ?? [],
  };
}

export function buildInvalidReasonMarkdown(payload) {
  const lines = [
    '# Phase12.5 INVALID Reason Summary',
    '',
    `**停止理由:** \`${payload.stopReason ?? 'unknown'}\``,
    `**終了:** ${payload.endedAt ?? '—'}`,
    `**開始:** ${payload.startedAt ?? '—'}`,
    '',
    '## 詳細',
    '',
    '| 項目 | 値 |',
    '|------|-----|',
    `| baselineAppPid | ${payload.baselineAppPid ?? '—'} |`,
    `| runtimeMode | ${payload.runtimeMode ?? 'dev'} |`,
    `| metroDownAt | ${payload.metroDownAt ?? '—'} |`,
    `| metroPid | ${payload.metroPid ?? '—'} |`,
    `| lastMetroCheck | ${payload.lastMetroCheck ?? '—'} |`,
    `| metroCheckDetails | ${payload.metroCheckDetails ? `\`${JSON.stringify(payload.metroCheckDetails)}\`` : '—'} |`,
    `| bundleErrorAt | ${payload.bundleErrorAt ?? '—'} |`,
    `| bundleSourceFile | ${payload.bundleSourceFile ?? '—'} |`,
    `| bundleMatchingLine | ${payload.bundleMatchingLine ? `\`${payload.bundleMatchingLine.slice(0, 120)}\`` : '—'} |`,
    `| watchDeadAt | ${payload.watchDeadAt ?? '—'} |`,
    `| pidLostEvents | ${payload.pidLostEvents} |`,
    `| pidChangedEvents | ${payload.pidChangedEvents} |`,
    `| previousPid | ${payload.previousPid ?? '—'} |`,
    `| currentPid | ${payload.currentPid ?? '—'} |`,
    '',
  ];
  if (payload.detectorErrors?.length) {
    lines.push('## Detector errors (non-fatal)', '', ...payload.detectorErrors.map((e) => `- ${e}`), '');
  }
  return lines.join('\n');
}

/**
 * Write JSON + Markdown invalid reason files. Never throws.
 */
export function writeInvalidReasonArtifacts({ logDir, state }) {
  const payload = buildInvalidReasonPayload(state);
  fs.mkdirSync(logDir, { recursive: true });
  const jsonPath = path.join(logDir, INVALID_REASON_JSON);
  const mdPath = path.join(logDir, INVALID_REASON_MD);
  try {
    fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  } catch (err) {
    console.warn('[p12.5] WARN invalid reason JSON:', err?.message ?? err);
  }
  try {
    fs.writeFileSync(mdPath, buildInvalidReasonMarkdown(payload), 'utf8');
  } catch (err) {
    console.warn('[p12.5] WARN invalid reason MD:', err?.message ?? err);
  }
  return { jsonPath, mdPath, payload };
}
