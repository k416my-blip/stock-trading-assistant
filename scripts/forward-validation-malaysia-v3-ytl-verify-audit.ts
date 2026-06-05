/**
 * npx tsx scripts/forward-validation-malaysia-v3-ytl-verify-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV3YtlVerifyCsv,
  runMalaysiaV3YtlVerifyAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV3YtlVerifyAudit';

async function main() {
  const report = await runMalaysiaV3YtlVerifyAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v3-ytl-verify-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV3YtlVerifyCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
