/**
 * Phase 4 セキュリティ静的検証
 * npx tsx src/verify/security.verify.ts
 */
import { readFileSync, readdirSync, statSync } from 'fs';
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

function walkTs(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'verify') continue;
      walkTs(p, out);
    } else if (name.endsWith('.ts') || name.endsWith('.tsx')) {
      out.push(p);
    }
  }
  return out;
}

const files = walkTs(ROOT);

// 1. API key services must use secretStorage, not plain AsyncStorage
for (const name of ['marketDataApiKey.ts', 'analysisApiKeys.ts', 'aiApiKey.ts']) {
  const path = join(ROOT, 'services', name);
  const text = readFileSync(path, 'utf8');
  if (text.includes('AsyncStorage.setItem') && text.includes('api')) {
    fail(`${name} must not write API keys via AsyncStorage`);
  } else if (text.includes("from './secretStorage'") || text.includes('from "./secretStorage"')) {
    pass(`${name} uses secretStorage abstraction`);
  } else {
    fail(`${name} must import secretStorage`);
  }
}

// 2. execution journal integrity wrapper
const journal = readFileSync(join(ROOT, 'services/executionJournalStorage.ts'), 'utf8');
if (journal.includes('wrapJournalWithIntegrity') && journal.includes('parseJournalEnvelope')) {
  pass('execution journal uses integrity envelope');
} else {
  fail('execution journal missing integrity metadata');
}

// 3. storage trusted load + migration
const storage = readFileSync(join(ROOT, 'services/storage.ts'), 'utf8');
if (storage.includes('loadAppStateTrusted') && storage.includes('migratePersistedAppStateRaw')) {
  pass('storage has trusted load and migration');
} else {
  fail('storage missing trusted load or migration');
}

// 4. marketDataService uses secureLog not raw console.log
const mds = readFileSync(join(ROOT, 'services/marketDataService.ts'), 'utf8');
if (mds.includes('secureLog') && !mds.match(/console\.log\(\s*'\[market-data\]/)) {
  pass('marketDataService uses secureLog for debug');
} else {
  fail('marketDataService still uses raw console.log for market-data debug');
}

// 5. No direct AsyncStorage secret key writes in services (except secretStorage migration)
const secretKeyPatterns = [
  /AsyncStorage\.setItem\(\s*STORAGE_KEYS\.twelveDataApiKey/,
  /AsyncStorage\.setItem\(\s*STORAGE_KEYS\.newsApiKey/,
  /AsyncStorage\.setItem\(\s*'@sta\/twelve_data_api_key'/,
  /AsyncStorage\.setItem\(\s*'@sta\/news_api_key'/,
];

for (const file of files) {
  const rel = file.replace(ROOT + '\\', '').replace(ROOT + '/', '');
  if (rel.includes('secretStorage.ts')) continue;
  const text = readFileSync(file, 'utf8');
  for (const pat of secretKeyPatterns) {
    if (pat.test(text)) {
      fail(`${rel} writes secrets to AsyncStorage directly`);
    }
  }
}
pass('no direct AsyncStorage secret writes outside secretStorage');

// 6. Error boundary exists
const boundary = join(ROOT, 'components/AppErrorBoundary.tsx');
try {
  readFileSync(boundary, 'utf8');
  pass('AppErrorBoundary component exists');
} catch {
  fail('AppErrorBoundary missing');
}

// 7. Security settings screen
try {
  readFileSync(join(ROOT, 'screens/SecuritySettingsScreen.tsx'), 'utf8');
  pass('SecuritySettingsScreen exists');
} catch {
  fail('SecuritySettingsScreen missing');
}

// 8. maskSecret utility
const mask = readFileSync(join(ROOT, 'utils/secretMask.ts'), 'utf8');
if (mask.includes('maskSecret') && mask.includes('redactSecretsInString')) {
  pass('secret masking utilities present');
} else {
  fail('secretMask utilities incomplete');
}

// 9. clear sensitive data service
try {
  const clear = readFileSync(join(ROOT, 'services/clearSensitiveData.ts'), 'utf8');
  if (clear.includes('deleteAllSecrets')) pass('clearSensitiveData uses deleteAllSecrets');
  else fail('clearSensitiveData incomplete');
} catch {
  fail('clearSensitiveData missing');
}

const aiService = readFileSync(join(ROOT, 'services/aiStrategyService.ts'), 'utf8');
if (aiService.includes('secureLog') && !aiService.match(/console\.log\([^)]*JSON\.stringify\(userPayload/)) {
  pass('aiStrategyService uses secureLog without raw payload logging');
} else {
  fail('aiStrategyService may log raw AI payload');
}

console.log(`\n${failed === 0 ? '✓' : '✗'} security verify: ${failed === 0 ? 'all checks passed' : `${failed} failed`}`);
if (failed > 0) process.exit(1);
