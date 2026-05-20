/**
 * 市場データ境界の静的チェック（開発時: npx tsx src/verify/marketDataBoundary.verify.ts）
 */
import { readdirSync, readFileSync, statSync } from 'fs';
import { join } from 'path';
import { MARKET_DATA_API_ALLOWED_IMPORTERS } from '../constants/marketDataArchitecture';

const ROOT = join(process.cwd(), 'src');
const FORBIDDEN_PATTERNS = [
  /from\s+['"]\.\/marketDataService['"]/,
  /from\s+['"]\.\.\/services\/marketDataService['"]/,
  /from\s+['"]\.\/marketDataRequestQueue['"]/,
  /from\s+['"]\.\.\/services\/marketDataRequestQueue['"]/,
  /\bgetQuoteForMarket\b/,
  /\bgetDailyOHLCV\b/,
  /\bfetchTwelveData\b/,
  /\bingestOHLCVDataset\b/,
];

const INTELLIGENCE_SUFFIXES = ['Engine.ts', 'OrchestratorService.ts'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      walk(full, out);
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      out.push(full);
    }
  }
  return out;
}

function rel(p: string): string {
  return p.replace(/\\/g, '/').replace(/^.*\/src\//, 'src/');
}

let failed = 0;

for (const file of walk(ROOT)) {
  const r = rel(file);
  const isIntelligence = INTELLIGENCE_SUFFIXES.some((s) => r.endsWith(s));
  if (!isIntelligence) continue;

  const text = readFileSync(file, 'utf8');
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(text)) {
      console.error(`✗ ${r} violates market data boundary (${pattern})`);
      failed += 1;
    }
  }
}

const allowed = new Set<string>(MARKET_DATA_API_ALLOWED_IMPORTERS);
for (const file of walk(ROOT)) {
  const r = rel(file);
  if (!/from\s+['"]\.\.?\/.*marketDataService['"]/.test(readFileSync(file, 'utf8'))) continue;
  if (!allowed.has(r) && !r.includes('marketDataService.ts')) {
    console.error(`✗ ${r} imports marketDataService but is not in allowlist`);
    failed += 1;
  }
}

if (failed > 0) {
  console.error(`\n${failed} boundary violation(s)`);
  process.exit(1);
}

console.log('✓ market data architecture boundary OK');
