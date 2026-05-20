/**
 * Full implementation audit — Phases 1–5 + Personal Production
 * npx tsx src/verify/fullAudit.verify.ts
 */
import { spawnSync } from 'child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SRC = join(ROOT, 'src');

let failed = 0;
let passed = 0;

function pass(phase: string, msg: string): void {
  passed += 1;
  console.log(`✓ [${phase}] ${msg}`);
}

function fail(phase: string, msg: string): void {
  failed += 1;
  console.error(`✗ [${phase}] ${msg}`);
}

function fileExists(rel: string): boolean {
  return existsSync(join(ROOT, rel));
}

function read(rel: string): string {
  return readFileSync(join(ROOT, rel), 'utf8');
}

function mustExist(phase: string, rel: string, label?: string): void {
  if (fileExists(rel)) pass(phase, label ?? rel);
  else fail(phase, `missing file: ${rel}`);
}

function mustInclude(phase: string, rel: string, needle: string, label?: string): void {
  const text = read(rel);
  if (text.includes(needle)) pass(phase, label ?? `${rel} contains ${needle}`);
  else fail(phase, `${rel} missing: ${needle}`);
}

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'verify' || name === 'node_modules') continue;
      walkTs(p, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

// ─── Phase 1: Data Integrity ───────────────────────────────────────────────
const P1 = 'P1-DataIntegrity';

mustExist(P1, 'src/services/portfolioTransaction.ts');
mustExist(P1, 'src/services/portfolioSnapshot.ts');
mustExist(P1, 'src/services/portfolioPersistenceGuard.ts');
mustExist(P1, 'src/services/integrityHash.ts');
mustInclude(P1, 'src/services/portfolioTransaction.ts', 'beginPortfolioTransaction');
mustInclude(P1, 'src/services/portfolioTransaction.ts', 'rollbackPortfolioSync');
mustInclude(P1, 'src/services/portfolioSnapshot.ts', 'saveHealthyPortfolioLists');
mustInclude(P1, 'src/services/portfolioPersistenceGuard.ts', 'rejectEmptyPortfolioReplace');
mustInclude(P1, 'src/services/portfolioPersistenceGuard.ts', 'guardAppStateForPersistence');
mustInclude(P1, 'src/services/integrityHash.ts', 'computeIntegrityHash');
mustExist(P1, 'src/screens/DataIntegrityScreen.tsx');
mustInclude(P1, 'src/navigation/RootNavigator.tsx', 'DataIntegrity');

// ─── Phase 2: Market Data Reliability ──────────────────────────────────────
const P2 = 'P2-MarketData';

mustExist(P2, 'src/services/marketDataService.ts');
mustExist(P2, 'src/constants/marketData.ts');
mustExist(P2, 'src/services/staleDataMetadata.ts');
mustExist(P2, 'src/services/quoteCache.ts');
mustInclude(P2, 'src/constants/marketData.ts', 'MARKET_DATA_MAX_CONCURRENT = 2');
mustInclude(P2, 'src/constants/marketData.ts', 'MARKET_DATA_SYMBOL_COOLDOWN_MS');
mustInclude(P2, 'src/services/marketDataService.ts', 'MARKET_DATA_MAX_CONCURRENT');
mustInclude(P2, 'src/services/marketDataService.ts', 'rateLimitUntil');
mustInclude(P2, 'src/services/marketDataService.ts', 'secureLog');

const FETCH_GATEWAY_SUFFIXES = [
  'src/services/marketDataService.ts',
  'src/services/aiStrategyService.ts',
  'src/services/apiVerificationService.ts',
];
const srcFiles = walkTs(SRC);
const fetchFiles = srcFiles.filter((f) => /\bawait fetch\(/.test(readFileSync(f, 'utf8')));
const nonGatewayFetch = fetchFiles.filter((f) => {
  const norm = f.replace(/\\/g, '/');
  return !FETCH_GATEWAY_SUFFIXES.some((suffix) => norm.endsWith(suffix));
});
if (nonGatewayFetch.length === 0) {
  pass(P2, 'HTTP fetch is limited to approved gateway modules');
} else {
  fail(P2, `unexpected fetch() in: ${nonGatewayFetch.map((f) => f.replace(ROOT, '')).join(', ')}`);
}

mustExist(P2, 'src/constants/marketDataArchitecture.ts');
mustExist(P2, 'src/verify/marketDataBoundary.verify.ts');

// ─── Phase 3: Execution Safety ─────────────────────────────────────────────
const P3 = 'P3-Execution';

mustExist(P3, 'src/services/executionOrderService.ts');
mustExist(P3, 'src/services/executionJournalStorage.ts');
mustExist(P3, 'src/services/executionSafetyGate.ts');
mustExist(P3, 'src/services/executionIdempotency.ts');
mustExist(P3, 'src/services/executionReconciliationService.ts');
mustExist(P3, 'src/constants/executionSafety.ts');
mustInclude(P3, 'src/services/executionOrderService.ts', 'submitExecutionOrder');
mustInclude(P3, 'src/services/executionOrderService.ts', 'idempotencyKey');
mustInclude(P3, 'src/services/executionSafetyGate.ts', 'assessExecutionMarketData');
mustInclude(P3, 'src/services/executionJournalStorage.ts', 'wrapJournalWithIntegrity');
mustExist(P3, 'src/screens/ExecutionReconciliationScreen.tsx');
mustInclude(P3, 'src/navigation/RootNavigator.tsx', 'ExecutionReconciliation');
mustInclude(P3, 'src/context/AppContext.tsx', 'submitTradeWithExecutionSafety');
mustInclude(P3, 'src/context/AppContext.tsx', 'submitExecutionOrder');
mustInclude(P3, 'src/screens/AddTradeScreen.tsx', 'submitTradeWithExecutionSafety');
mustInclude(P3, 'src/screens/AddTradeScreen.tsx', 'assessExecutionMarketData');

// ─── Phase 4: Security ───────────────────────────────────────────────────────
const P4 = 'P4-Security';

mustExist(P4, 'src/services/secretStorage.ts');
mustExist(P4, 'src/utils/secretMask.ts');
mustExist(P4, 'src/services/secureLogger.ts');
mustExist(P4, 'src/services/tamperDetection.ts');
mustExist(P4, 'src/services/persistenceMigration.ts');
mustExist(P4, 'src/services/safeBoot.ts');
mustExist(P4, 'src/services/clearSensitiveData.ts');
mustExist(P4, 'src/components/AppErrorBoundary.tsx');
mustExist(P4, 'src/screens/SecuritySettingsScreen.tsx');
mustInclude(P4, 'App.tsx', 'AppErrorBoundary');
mustInclude(P4, 'src/services/marketDataApiKey.ts', 'secretStorage');
mustInclude(P4, 'src/services/storage.ts', 'loadAppStateTrusted');
mustInclude(P4, 'src/services/storage.ts', 'migratePersistedAppStateRaw');
mustInclude(P4, 'src/utils/secretMask.ts', 'maskSecret');
mustInclude(P4, 'src/services/secureLogger.ts', 'redactSecretsInString');

const secretPatterns = [
  /AsyncStorage\.setItem\(\s*STORAGE_KEYS\.twelveDataApiKey/,
  /AsyncStorage\.setItem\(\s*'@sta\/twelve_data_api_key'/,
];
let secretLeak = false;
for (const file of srcFiles) {
  const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  if (rel.includes('secretStorage.ts')) continue;
  const text = readFileSync(file, 'utf8');
  for (const pat of secretPatterns) {
    if (pat.test(text)) {
      fail(P4, `${rel} writes API key to AsyncStorage`);
      secretLeak = true;
    }
  }
  if (/console\.log\([^)]*apikey/i.test(text) && !rel.includes('secureLogger.ts')) {
    fail(P4, `${rel} may log API key via console.log`);
    secretLeak = true;
  }
}
if (!secretLeak) pass(P4, 'no plain AsyncStorage API key writes or raw secret console.log');

// ─── Phase 5: Testing / Release Ops ─────────────────────────────────────────
const P5 = 'P5-ReleaseOps';

mustExist(P5, 'vitest.config.ts');
mustExist(P5, '.github/workflows/ci.yml');
mustExist(P5, 'src/services/structuredDiagnostics.ts');
mustExist(P5, 'src/services/environmentValidation.ts');
mustExist(P5, 'src/components/DegradedModeBanner.tsx');
mustExist(P5, 'src/screens/StartupDiagnosticsScreen.tsx');
mustInclude(P5, 'src/screens/HomeScreen.tsx', 'DegradedModeBanner');
mustInclude(P5, 'src/navigation/RootNavigator.tsx', 'StartupDiagnostics');
mustInclude(P5, 'src/verify/runRelease.verify.ts', 'personal-production');

const testDirs = [
  'tests/unit',
  'tests/integration',
  'tests/recovery',
  'tests/execution',
  'tests/persistence',
];
for (const d of testDirs) {
  if (fileExists(d)) pass(P5, `test dir: ${d}`);
  else fail(P5, `missing test dir: ${d}`);
}

// ─── Personal Production ─────────────────────────────────────────────────────
const PP = 'PersonalProd';

mustExist(PP, 'docs/DEVICE_SMOKE_TEST_CHECKLIST.md');
mustExist(PP, 'src/constants/deviceSmokeTestChecklist.ts');
mustExist(PP, 'src/services/personalBackupService.ts');
mustExist(PP, 'src/services/dailyHealthCheckService.ts');
mustExist(PP, 'src/services/personalKillSwitches.ts');
mustExist(PP, 'src/utils/confirmDestructive.ts');
mustExist(PP, 'src/screens/PersonalProductionScreen.tsx');
mustInclude(PP, 'src/navigation/RootNavigator.tsx', 'PersonalProduction');
mustInclude(PP, 'src/screens/SettingsScreen.tsx', 'PersonalProduction');
mustInclude(PP, 'src/services/personalBackupService.ts', 'exportPersonalBackupJson');
mustInclude(PP, 'src/services/personalBackupService.ts', 'validatePersonalBackupJson');
mustInclude(PP, 'src/services/dailyHealthCheckService.ts', 'runDailyHealthCheck');
mustInclude(PP, 'src/services/personalKillSwitches.ts', 'readOnlyMode');
mustInclude(PP, 'src/services/personalKillSwitches.ts', 'disableMarketRefresh');
mustInclude(PP, 'src/services/personalKillSwitches.ts', 'disableTradeSubmission');
mustInclude(PP, 'src/context/AppContext.tsx', 'restoreLastHealthySnapshot');
mustInclude(PP, 'src/context/AppContext.tsx', 'resetRequestQueue');
mustInclude(PP, 'src/screens/PortfolioScreen.tsx', 'confirmDestructiveAction');

// ─── AI Strategy Assistant ─────────────────────────────────────────────────────
const AI = 'AI-Strategy';

mustExist(AI, 'src/services/aiStrategyService.ts');
mustExist(AI, 'src/services/aiContextBuilder.ts');
mustExist(AI, 'src/screens/AiSettingsScreen.tsx');
mustExist(AI, 'src/screens/ApiSetupWizardScreen.tsx');
mustExist(AI, 'src/services/apiVerificationService.ts');
mustExist(AI, 'src/services/apiHealthStorage.ts');
mustInclude(AI, 'src/navigation/RootNavigator.tsx', 'ApiSetupWizard');
mustInclude(AI, 'src/screens/SettingsScreen.tsx', 'ApiSetupWizard');
mustExist(AI, 'src/components/AiAssistantChat.tsx');
mustInclude(AI, 'src/context/AppContext.tsx', 'sendAiStrategyMessage');
mustInclude(AI, 'src/services/aiApiKey.ts', 'secretStorage');
mustInclude(AI, 'src/navigation/types.ts', 'AiSettings');
mustInclude(AI, 'tests/unit/aiStrategyService.test.ts', 'fallback_mock');
mustInclude(AI, 'src/services/aiStrategyService.ts', 'probeAiApiConnection');
mustInclude(AI, 'src/components/AiAssistantChat.tsx', 'isLoading');
mustExist(AI, 'src/services/centralIntelligenceContext.ts');
mustExist(AI, 'src/components/CentralIntelligencePanel.tsx');
mustExist(AI, 'docs/CENTRAL_INTELLIGENCE_ARCHITECTURE.md');
mustInclude(AI, 'tests/unit/centralIntelligenceContext.test.ts', 'systemAwareness');
mustExist(AI, 'src/context/AiConciergeContext.tsx');
mustExist(AI, 'src/components/concierge/AiConciergeOverlay.tsx');
mustExist(AI, 'docs/AI_CONCIERGE_ARCHITECTURE.md');
mustInclude(AI, 'tests/unit/aiConcierge.test.ts', 'detectConciergeMode');
mustInclude(AI, 'App.tsx', 'AiConciergeOverlay');
mustExist(AI, 'src/services/aiPersonalityGuard.ts');
mustExist(AI, 'docs/AI_PERSONALITY_GUARDRAILS.md');
mustExist(AI, 'docs/PLATFORM_CLARIFICATION.md');
mustExist(AI, 'src/constants/platformClarification.ts');
mustExist(AI, 'src/components/PlatformClarificationCard.tsx');
mustInclude(AI, 'src/screens/SettingsScreen.tsx', 'PlatformClarificationCard');
mustInclude(AI, 'src/constants/platformClarification.ts', '実運用分析モード');
mustInclude(AI, 'tests/unit/aiPersonalityGuard.test.ts', 'personality mutation');
mustInclude(AI, 'src/services/aiStrategyService.ts', 'buildFixedAiInstructions');

// ─── Package scripts ───────────────────────────────────────────────────────────
const PKG = 'PackageScripts';
const pkg = JSON.parse(read('package.json')) as { scripts?: Record<string, string> };
const requiredScripts = [
  'typecheck',
  'lint',
  'test',
  'test:unit',
  'test:integration',
  'verify:security',
  'verify:release',
  'verify:diagnostics',
  'verify:integration',
  'verify:personal-production',
  'verify:full-audit',
];
for (const s of requiredScripts) {
  if (pkg.scripts?.[s]) pass(PKG, `script: ${s}`);
  else fail(PKG, `missing script: ${s}`);
}

// ─── Delegate runtime verify suites ──────────────────────────────────────────
const runtimeSteps = [
  { phase: 'Runtime', label: 'commercial-hardening', script: 'src/verify/runCommercialHardening.verify.ts' },
  { phase: 'Runtime', label: 'diagnostics', script: 'src/verify/diagnostics.verify.ts' },
  { phase: 'Runtime', label: 'release', script: 'src/verify/release.verify.ts' },
  { phase: 'Runtime', label: 'personal-production', script: 'src/verify/personalProduction.verify.ts' },
  { phase: 'Runtime', label: 'ai-strategy', script: 'src/verify/aiStrategy.verify.ts' },
];

console.log('\n── Runtime verify suites ──\n');
for (const step of runtimeSteps) {
  console.log(`── ${step.label} ──`);
  const result = spawnSync('npx', ['tsx', join(ROOT, step.script)], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });
  if (result.status === 0) pass(step.phase, `${step.label} verify passed`);
  else fail(step.phase, `${step.label} verify failed`);
}

console.log(`\n${'═'.repeat(60)}`);
console.log(`Full audit static: ${passed} passed, ${failed} failed`);
console.log(`${failed === 0 ? '✓' : '✗'} full audit ${failed === 0 ? 'PASSED' : 'FAILED'}`);
if (failed > 0) process.exit(1);
