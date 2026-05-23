/**
 * Post-soak failure auto analysis — mechanical production sign-off from JSON export.
 * Pure analysis — no runtime mutations.
 */
import type {
  PostSoakAnalysisBundle,
  PostSoakAnalysisInput,
  PostSoakAnalysisReport,
  PostSoakAnomalyTimelineEntry,
  PostSoakAutoFailReason,
  PostSoakReleaseTier,
  PostSoakRootEvent,
  PostSoakRootEventKind,
  PostSoakSubScores,
  PostSoakVerdict,
} from '../../types/postSoakAnalysis';
import type { RedmiLongSoakExport } from '../../types/redmiLongSoakValidation';
import {
  POST_SOAK_ANALYSIS_VERSION,
  POST_SOAK_FAIL_DELAYED_RESUME_MS,
  POST_SOAK_FAIL_DUPLICATE_SOCKETS,
  POST_SOAK_FAIL_HYDRATION_OVERLAP,
  POST_SOAK_FAIL_OWNERSHIP_VIOLATIONS,
  POST_SOAK_FAIL_RECONNECT_STORM_PER_MIN,
  POST_SOAK_FAIL_SILENT_DISCONNECT,
  POST_SOAK_FAIL_TIMER_DRIFT_MS,
  POST_SOAK_RELEASE_TIER_LABELS,
  POST_SOAK_SCORE_GUARDED_RELEASE,
  POST_SOAK_SCORE_HIGH_RISK,
  POST_SOAK_SCORE_PRODUCTION_READY,
} from '../../constants/postSoakAnalysis';
import { REDMI_SOAK_MIN_HOURS } from '../../constants/redmiLongSoakValidation';

type RootCandidate = PostSoakRootEvent & { sortKey: number };

function parseTime(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

function maxReconnectPerMin(exp: RedmiLongSoakExport): number {
  let max = 0;
  for (const cp of exp.checkpoints) {
    max = Math.max(max, cp.reconnectPerMin);
  }
  return max;
}

function maxResumeLatencyMs(exp: RedmiLongSoakExport): number {
  let max = exp.anomalyReplaySnapshot.miui.resumeLatencyMs;
  for (const cp of exp.checkpoints) {
    max = Math.max(max, cp.resumeLatencyMs);
  }
  return max;
}

function maxTimerDriftMs(exp: RedmiLongSoakExport): number {
  return exp.anomalyReplaySnapshot.miui.timerDriftMs;
}

function silentDisconnectCount(exp: RedmiLongSoakExport): number {
  return exp.anomalyReplaySnapshot.miui.silentDisconnectCount;
}

function hydrationOverlapMax(exp: RedmiLongSoakExport): number {
  return exp.anomalyReplaySnapshot.hydrationLock.overlapCount;
}

function ownershipViolationCount(exp: RedmiLongSoakExport): number {
  const checks = exp.summary.criticalChecks;
  return (
    checks.coordinator_ownership_violation.occurrences +
    checks.native_reconnect_bypass.occurrences
  );
}

function duplicateSocketCount(exp: RedmiLongSoakExport): number {
  return Math.max(
    exp.boundaryValidation.comparison.duplicateSocketCount,
    exp.anomalyReplaySnapshot.stability?.metrics.wsDuplicateCount ?? 0,
  );
}

function evaluateAutoFail(exp: RedmiLongSoakExport): PostSoakAutoFailReason[] {
  const reasons: PostSoakAutoFailReason[] = [];

  if (!exp.summary.minDurationMet) reasons.push('min_duration_not_met');
  if (duplicateSocketCount(exp) > POST_SOAK_FAIL_DUPLICATE_SOCKETS) {
    reasons.push('duplicate_sockets');
  }
  if (ownershipViolationCount(exp) > POST_SOAK_FAIL_OWNERSHIP_VIOLATIONS) {
    reasons.push('ownership_violation');
  }
  if (exp.summary.criticalChecks.native_reconnect_bypass.occurrences > 0) {
    reasons.push('native_reconnect_bypass');
  }
  if (maxReconnectPerMin(exp) >= POST_SOAK_FAIL_RECONNECT_STORM_PER_MIN) {
    reasons.push('reconnect_storm');
  }
  if (hydrationOverlapMax(exp) >= POST_SOAK_FAIL_HYDRATION_OVERLAP) {
    reasons.push('hydration_overlap');
  }
  if (maxTimerDriftMs(exp) >= POST_SOAK_FAIL_TIMER_DRIFT_MS) {
    reasons.push('timer_resurrection');
  }
  if (maxResumeLatencyMs(exp) >= POST_SOAK_FAIL_DELAYED_RESUME_MS) {
    reasons.push('delayed_resume');
  }
  if (silentDisconnectCount(exp) >= POST_SOAK_FAIL_SILENT_DISCONNECT) {
    reasons.push('silent_websocket_disconnect');
  }

  return reasons;
}

function computeSubScores(exp: RedmiLongSoakExport, autoFail: PostSoakAutoFailReason[]): PostSoakSubScores {
  const dup = duplicateSocketCount(exp);
  const cmp = exp.boundaryValidation.comparison;
  const stormMax = maxReconnectPerMin(exp);
  const miui = exp.anomalyReplaySnapshot.miui;

  let reconnectIntegrityScore = 100;
  if (dup > 0) reconnectIntegrityScore -= 35;
  if (cmp.jsExecuteCount > cmp.jsScheduleCount + cmp.coalescedCount + 1) {
    reconnectIntegrityScore -= 25;
  }
  if (exp.boundaryValidation.bypassDetected) reconnectIntegrityScore -= 30;
  reconnectIntegrityScore = Math.max(0, reconnectIntegrityScore);

  let ownershipConsistencyScore = cmp.ownershipConsistent ? 100 : 55;
  if (cmp.orphanNativeReconnect > 0) ownershipConsistencyScore -= 25;
  ownershipConsistencyScore = Math.max(0, ownershipConsistencyScore);

  let stormSuppressionScore = 100;
  if (stormMax >= POST_SOAK_FAIL_RECONNECT_STORM_PER_MIN) stormSuppressionScore -= 40;
  else if (stormMax >= 2) stormSuppressionScore -= 15;
  if (cmp.coalescedCount > 0 && stormMax < POST_SOAK_FAIL_RECONNECT_STORM_PER_MIN) {
    stormSuppressionScore = Math.min(100, stormSuppressionScore + 5);
  }
  stormSuppressionScore = Math.max(0, stormSuppressionScore);

  let miuiResilienceScore = 100;
  if (miui.resumeLatencyMs >= POST_SOAK_FAIL_DELAYED_RESUME_MS) miuiResilienceScore -= 25;
  if (miui.timerDriftMs >= POST_SOAK_FAIL_TIMER_DRIFT_MS) miuiResilienceScore -= 20;
  if (miui.silentDisconnectCount >= 1) miuiResilienceScore -= 20;
  if (exp.anomalyReplaySnapshot.stability?.anomalies.some((a) => a.kind === 'miui_battery_kill')) {
    miuiResilienceScore -= 15;
  }
  miuiResilienceScore = Math.max(0, miuiResilienceScore);

  void autoFail;
  return {
    reconnectIntegrityScore,
    ownershipConsistencyScore,
    stormSuppressionScore,
    miuiResilienceScore,
  };
}

function computeFinalScore(sub: PostSoakSubScores, autoFail: PostSoakAutoFailReason[]): number {
  const avg =
    (sub.reconnectIntegrityScore +
      sub.ownershipConsistencyScore +
      sub.stormSuppressionScore +
      sub.miuiResilienceScore) /
    4;
  let penalty = autoFail.length * 8;
  if (autoFail.includes('native_reconnect_bypass')) penalty += 12;
  if (autoFail.includes('ownership_violation')) penalty += 10;
  if (autoFail.includes('reconnect_storm')) penalty += 8;
  return Math.max(0, Math.min(100, Math.round(avg - penalty)));
}

function releaseTierFromScore(score: number): PostSoakReleaseTier {
  if (score >= POST_SOAK_SCORE_PRODUCTION_READY) return 'production_ready';
  if (score >= POST_SOAK_SCORE_GUARDED_RELEASE) return 'guarded_release';
  if (score >= POST_SOAK_SCORE_HIGH_RISK) return 'high_operational_risk';
  return 'unstable_runtime';
}

/** Find first ownership collapse — not cascade followers. */
export function findRootOwnershipEvent(exp: RedmiLongSoakExport): PostSoakRootEvent | null {
  const candidates: RootCandidate[] = [];

  for (const e of exp.boundaryValidation.recentBoundaryTrace) {
    if (e.kind === 'ownership_mismatch') {
      candidates.push({
        at: e.at,
        sortKey: parseTime(e.at),
        kind: 'ownership_mismatch',
        detailJa: e.detailJa,
        reconnectUuid: e.reconnectUuid,
      });
    }
  }

  for (const row of exp.boundaryValidation.websocketOwnership) {
    if (row.owner === 'native_untagged') {
      candidates.push({
        at: row.scheduledAt,
        sortKey: parseTime(row.scheduledAt),
        kind: 'native_untagged',
        detailJa: `native untagged ${row.reconnectUuid}`,
        reconnectUuid: row.reconnectUuid,
        source: row.source,
      });
    }
    if (row.duplicate) {
      candidates.push({
        at: row.scheduledAt,
        sortKey: parseTime(row.scheduledAt),
        kind: 'duplicate_socket',
        detailJa: `duplicate socket ${row.reconnectUuid}`,
        reconnectUuid: row.reconnectUuid,
        source: row.source,
      });
    }
    if (
      row.owner === 'js_execute' &&
      !exp.boundaryValidation.websocketOwnership.some(
        (s) => s.reconnectUuid === row.reconnectUuid && s.owner === 'js_coordinator',
      )
    ) {
      candidates.push({
        at: row.executedAt ?? row.scheduledAt,
        sortKey: parseTime(row.executedAt ?? row.scheduledAt),
        kind: 'orphan_execute',
        detailJa: `execute without coordinator schedule ${row.reconnectUuid}`,
        reconnectUuid: row.reconnectUuid,
      });
    }
  }

  const scheduledTokens = new Set<string>();
  for (const t of [
    ...exp.boundaryValidation.reconnectTimeline,
    ...(exp.anomalyReplaySnapshot.reconnectTrace ?? []),
  ]) {
    if (t.phase === 'schedule' && t.token) scheduledTokens.add(t.token);
  }
  for (const t of exp.boundaryValidation.reconnectTimeline) {
    if (t.phase === 'execute' && t.token && !scheduledTokens.has(t.token)) {
      candidates.push({
        at: t.at,
        sortKey: parseTime(t.at),
        kind: 'execute_without_schedule',
        detailJa: t.detailJa,
        reconnectUuid: t.token,
        source: t.source,
      });
    }
  }

  for (const t of exp.anomalyReplaySnapshot.reconnectTrace ?? []) {
    if (t.phase === 'execute' && t.token && !scheduledTokens.has(t.token)) {
      const at = t.at;
      if (!candidates.some((c) => c.reconnectUuid === t.token && c.kind === 'execute_without_schedule')) {
        candidates.push({
          at,
          sortKey: parseTime(at),
          kind: 'execute_without_schedule',
          detailJa: t.detailJa,
          reconnectUuid: t.token,
          source: t.source,
        });
      }
    }
  }

  if (exp.boundaryValidation.bypassDetected) {
    const firstBypass = exp.failureTimeline.find(
      (f) => f.check === 'native_reconnect_bypass' || f.check === 'coordinator_ownership_violation',
    );
    candidates.push({
      at: firstBypass?.at ?? exp.boundaryValidation.measuredAt,
      sortKey: parseTime(firstBypass?.at ?? exp.boundaryValidation.measuredAt),
      kind: 'native_bypass',
      detailJa: exp.boundaryValidation.bypassDetailJa,
    });
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.sortKey - b.sortKey || a.at.localeCompare(b.at));
  const first = candidates[0];
  return {
    at: first.at,
    kind: first.kind,
    detailJa: first.detailJa,
    reconnectUuid: first.reconnectUuid,
    source: first.source,
  };
}

function buildAnomalyTimeline(
  exp: RedmiLongSoakExport,
  root: PostSoakRootEvent | null,
): PostSoakAnomalyTimelineEntry[] {
  const entries: PostSoakAnomalyTimelineEntry[] = [];

  if (root) {
    entries.push({
      at: root.at,
      category: 'root',
      summaryJa: `ROOT · ${root.kind} · ${root.detailJa}`,
      severity: 'critical',
    });
  }

  for (const f of exp.failureTimeline) {
    entries.push({
      at: f.at,
      category: 'failure',
      summaryJa: `${f.check}: ${f.detailJa}`,
      severity: f.severity === 'critical' ? 'critical' : 'warn',
    });
  }

  for (const cp of exp.checkpoints.filter((c) => !c.ownershipConsistent || c.bypassDetected)) {
    entries.push({
      at: cp.at,
      category: 'checkpoint',
      summaryJa: `checkpoint bypass=${cp.bypassDetected} ownership=${cp.ownershipConsistent} reconnect=${cp.reconnectPerMin}/min`,
      severity: 'warn',
    });
  }

  for (const t of exp.boundaryValidation.reconnectTimeline.filter(
    (r) => r.phase === 'budget_block' || r.phase === 'coalesce',
  )) {
    entries.push({
      at: t.at,
      category: 'reconnect',
      summaryJa: `${t.phase}: ${t.detailJa}`,
      severity: 'info',
    });
  }

  entries.sort((a, b) => parseTime(a.at) - parseTime(b.at));
  return entries;
}

function buildAnomalySummary(autoFail: PostSoakAutoFailReason[], root: PostSoakRootEvent | null): string {
  if (autoFail.length === 0) return 'no auto-fail conditions detected';
  const parts = [`${autoFail.length} fail condition(s): ${autoFail.join(', ')}`];
  if (root) parts.push(`root event ${root.kind} @ ${root.at}`);
  return parts.join(' · ');
}

function buildSignOffSummary(
  verdict: PostSoakVerdict,
  tier: PostSoakReleaseTier,
  score: number,
  autoFail: PostSoakAutoFailReason[],
): string {
  const tierLabel = POST_SOAK_RELEASE_TIER_LABELS[tier];
  if (verdict === 'PASS') {
    return `SIGN-OFF PASS · score ${score} · ${tierLabel}`;
  }
  return `SIGN-OFF FAIL · score ${score} · ${tierLabel} · blockers: ${autoFail.join(', ')}`;
}

function buildReplayPackage(exp: RedmiLongSoakExport, root: PostSoakRootEvent | null) {
  return exp.anomalyReplaySnapshot;
}

export function analyzeRedmiSoakReport(input: PostSoakAnalysisInput): PostSoakAnalysisReport {
  const autoFailReasons = evaluateAutoFail(input);
  const subScores = computeSubScores(input, autoFailReasons);
  const finalScore = computeFinalScore(subScores, autoFailReasons);
  const releaseTier = releaseTierFromScore(finalScore);
  const strictVerdict: PostSoakVerdict = autoFailReasons.length === 0 ? 'PASS' : 'FAIL';
  const rootEvent = findRootOwnershipEvent(input);
  const riskScore = Math.max(0, Math.min(100, 100 - finalScore));

  return {
    version: POST_SOAK_ANALYSIS_VERSION,
    analyzedAt: new Date().toISOString(),
    verdict: strictVerdict,
    releaseTier,
    riskScore,
    finalScore,
    autoFailReasons,
    anomalySummaryJa: buildAnomalySummary(autoFailReasons, rootEvent),
    subScores,
    rootEvent,
    anomalyTimeline: buildAnomalyTimeline(input, rootEvent),
    replayPackage: buildReplayPackage(input, rootEvent),
    productionSignOffSummaryJa: buildSignOffSummary(strictVerdict, releaseTier, finalScore, autoFailReasons),
    minDurationMet: input.summary.minDurationMet,
    deviceModel: input.summary.session.deviceModel,
    elapsedHours: input.summary.session.elapsedMs / 3_600_000,
  };
}

export function formatPostSoakAnalysisMarkdown(report: PostSoakAnalysisReport): string {
  const lines = [
    `# Post-Soak Analysis v${report.version}`,
    '',
    `**Analyzed:** ${report.analyzedAt}`,
    `**Device:** ${report.deviceModel}`,
    `**Elapsed:** ${report.elapsedHours.toFixed(2)}h (min ${REDMI_SOAK_MIN_HOURS}h required: ${report.minDurationMet ? 'yes' : 'no'})`,
    '',
    `## Verdict: ${report.verdict}`,
    `**Release tier:** ${POST_SOAK_RELEASE_TIER_LABELS[report.releaseTier]}`,
    `**Final score:** ${report.finalScore}/100 · **Risk score:** ${report.riskScore}/100`,
    '',
    report.productionSignOffSummaryJa,
    '',
    '## Sub-scores',
    `- Reconnect integrity: ${report.subScores.reconnectIntegrityScore}`,
    `- Ownership consistency: ${report.subScores.ownershipConsistencyScore}`,
    `- Storm suppression: ${report.subScores.stormSuppressionScore}`,
    `- MIUI resilience: ${report.subScores.miuiResilienceScore}`,
    '',
    '## Auto-fail reasons',
    report.autoFailReasons.length === 0
      ? '- none'
      : report.autoFailReasons.map((r) => `- ${r}`).join('\n'),
    '',
    '## Anomaly summary',
    report.anomalySummaryJa,
  ];

  if (report.rootEvent) {
    lines.push(
      '',
      '## Root event (first ownership collapse)',
      `- **At:** ${report.rootEvent.at}`,
      `- **Kind:** ${report.rootEvent.kind}`,
      `- **Detail:** ${report.rootEvent.detailJa}`,
    );
    if (report.rootEvent.reconnectUuid) {
      lines.push(`- **UUID:** ${report.rootEvent.reconnectUuid}`);
    }
  }

  if (report.anomalyTimeline.length > 0) {
    lines.push('', '## Anomaly timeline (first 15)');
    for (const e of report.anomalyTimeline.slice(0, 15)) {
      lines.push(`- [${e.at}] (${e.category}/${e.severity}) ${e.summaryJa}`);
    }
  }

  return lines.join('\n');
}

export function exportPostSoakAnalysisJson(report: PostSoakAnalysisReport): string {
  return JSON.stringify(report, null, 2);
}

export function analyzeRedmiSoakReportBundle(input: PostSoakAnalysisInput): PostSoakAnalysisBundle {
  const report = analyzeRedmiSoakReport(input);
  return {
    report,
    markdownReport: formatPostSoakAnalysisMarkdown(report),
    jsonReport: exportPostSoakAnalysisJson(report),
  };
}

export function parseRedmiSoakExportJson(raw: string): RedmiLongSoakExport {
  return JSON.parse(raw) as RedmiLongSoakExport;
}

export function analyzeRedmiSoakExportJson(raw: string): PostSoakAnalysisBundle {
  return analyzeRedmiSoakReportBundle(parseRedmiSoakExportJson(raw));
}
