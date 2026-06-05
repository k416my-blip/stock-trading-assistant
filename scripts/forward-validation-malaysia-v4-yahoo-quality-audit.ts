/**
 * npx tsx scripts/forward-validation-malaysia-v4-yahoo-quality-audit.ts
 */
import { config } from 'dotenv';
import { writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import {
  formatMalaysiaV4YahooQualityCsv,
  runMalaysiaV4YahooQualityAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV4YahooQualityAudit';

config({ path: resolve(process.cwd(), '.env') });
config({ path: resolve(process.cwd(), '.env.local') });

async function main() {
  const report = await runMalaysiaV4YahooQualityAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v4-yahoo-quality-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV4YahooQualityCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
