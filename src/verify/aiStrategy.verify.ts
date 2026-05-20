/**
 * AI戦略アシスタント静的検証
 * npx tsx src/verify/aiStrategy.verify.ts
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd(), 'src');
let failed = 0;

function fail(msg: string): void {
  console.error(`✗ ${msg}`);
  failed += 1;
}

function pass(msg: string): void {
  console.log(`✓ ${msg}`);
}

const required = [
  'services/centralIntelligenceContext.ts',
  'services/aiStrategyService.ts',
  'services/aiContextBuilder.ts',
  'hooks/useCentralIntelligence.ts',
  'components/CentralIntelligencePanel.tsx',
  'context/AiConciergeContext.tsx',
  'components/concierge/AiConciergeOverlay.tsx',
  'components/concierge/AiConciergeFab.tsx',
  'services/aiConciergeIntent.ts',
  'services/aiVoiceInputService.ts',
  'services/aiVoiceInputCore.ts',
  'services/aiPersonalityGuard.ts',
  'constants/aiPersonalityGuardrails.ts',
  'services/aiResponseSanitizer.ts',
  'services/aiApiKey.ts',
  'services/aiPreferencesStorage.ts',
  'services/aiChatHistoryStorage.ts',
  'screens/AiSettingsScreen.tsx',
  'components/AiAssistantChat.tsx',
  'constants/aiStrategy.ts',
];

for (const rel of required) {
  try {
    readFileSync(join(ROOT, rel), 'utf8');
    pass(`exists: ${rel}`);
  } catch {
    fail(`missing: ${rel}`);
  }
}

const aiKey = readFileSync(join(ROOT, 'services/aiApiKey.ts'), 'utf8');
if (aiKey.includes('secretStorage')) pass('aiApiKey uses secretStorage');
else fail('aiApiKey must use secretStorage');

const service = readFileSync(join(ROOT, 'services/aiStrategyService.ts'), 'utf8');
const constants = readFileSync(join(ROOT, 'constants/aiStrategy.ts'), 'utf8');
if (
  service.includes('mock_fallback') &&
  service.includes('AI_API_TIMEOUT_MS') &&
  service.includes('isRetryableAiApiError')
) {
  pass('aiStrategyService has timeout, retry, and fallback');
} else {
  fail('aiStrategyService missing timeout/retry/fallback');
}

const central = readFileSync(join(ROOT, 'services/centralIntelligenceContext.ts'), 'utf8');
if (central.includes('buildCentralIntelligenceWorldModel') && central.includes('systemAwareness')) {
  pass('centralIntelligenceContext builds world model');
} else {
  fail('centralIntelligenceContext incomplete');
}

if (readFileSync(join(ROOT, 'screens/HomeScreen.tsx'), 'utf8').includes('CentralIntelligencePanel')) {
  pass('HomeScreen uses CentralIntelligencePanel');
} else {
  fail('HomeScreen missing CentralIntelligencePanel');
}

const guard = readFileSync(join(ROOT, 'services/aiPersonalityGuard.ts'), 'utf8');
if (guard.includes('buildFixedAiInstructions') && guard.includes('validateDisclosureCompliance')) {
  pass('aiPersonalityGuard enforces fixed philosophy');
} else {
  fail('aiPersonalityGuard incomplete');
}

if (readFileSync(join(ROOT, 'services/aiChatHistoryStorage.ts'), 'utf8').includes('UI-only')) {
  pass('aiChatHistoryStorage marked UI-only not training');
} else {
  fail('aiChatHistoryStorage missing UI-only scope');
}
if (constants.includes('/v1/responses')) {
  pass('aiStrategy constants use OpenAI responses API URL');
} else {
  fail('aiStrategy constants missing responses API URL');
}
if (service.includes('probeAiApiConnection') && service.includes('AI_BOOT_CHECK_TIMEOUT_MS')) {
  pass('aiStrategyService has boot connection probe');
} else {
  fail('aiStrategyService missing boot probe');
}
if (service.includes('AI_ERROR_API_KEY_MISSING') && service.includes('AI_ERROR_TIMEOUT')) {
  pass('aiStrategyService defines Japanese error messages');
} else {
  fail('aiStrategyService missing Japanese error constants');
}
if (!service.includes('console.log') || !service.match(/console\.log\([^)]*context/)) {
  pass('aiStrategyService avoids raw context console.log');
} else {
  fail('aiStrategyService logs raw context');
}

const builder = readFileSync(join(ROOT, 'services/aiContextBuilder.ts'), 'utf8');
if (builder.includes('assertAiPayloadSafe') && builder.includes('journalSummary')) {
  pass('aiContextBuilder sends summarized journal only');
} else {
  fail('aiContextBuilder incomplete');
}

const chat = readFileSync(join(ROOT, 'components/AiAssistantChat.tsx'), 'utf8');
if (
  chat.includes('sendAiStrategyMessage') &&
  (chat.includes('personalAssistBadge') || chat.includes('個人利用の分析補助'))
) {
  pass('AiAssistantChat wired to AppContext');
} else {
  fail('AiAssistantChat not wired');
}

const settings = readFileSync(join(ROOT, 'screens/SettingsScreen.tsx'), 'utf8');
if (settings.includes('AiSettings')) pass('Settings links to AiSettings');
else fail('Settings missing AiSettings link');
if (settings.includes('PlatformClarificationCard')) {
  pass('Settings shows platform clarification');
} else {
  fail('Settings missing PlatformClarificationCard');
}

const platform = readFileSync(join(ROOT, 'constants/platformClarification.ts'), 'utf8');
if (platform.includes('実運用分析モード') && platform.includes('分析支援システム')) {
  pass('platformClarification constants defined');
} else {
  fail('platformClarification incomplete');
}

const nav = readFileSync(join(ROOT, 'navigation/RootNavigator.tsx'), 'utf8');
if (nav.includes('AiSettingsScreen')) pass('RootNavigator registers AiSettings');
else fail('RootNavigator missing AiSettings');

console.log(`\n${failed === 0 ? '✓' : '✗'} ai-strategy verify: ${failed === 0 ? 'all checks passed' : `${failed} failed`}`);
if (failed > 0) process.exit(1);
