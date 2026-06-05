/**
 * npx tsx scripts/forward-validation-malaysia-v3-ytl-dependency-audit.ts
 */
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  formatMalaysiaV3YtlDependencyCsv,
  runMalaysiaV3YtlDependencyAudit,
} from '../src/services/forwardValidation/forwardValidationMalaysiaV3YtlDependencyAudit';

async function main() {
  const report = await runMalaysiaV3YtlDependencyAudit();
  if (!report) {
    console.error('Yahoo fetch failed');
    process.exit(1);
  }
  console.log(report.humanSummaryJa);
  const outPath = join(
    process.cwd(),
    'scripts',
    'forward-validation-malaysia-v3-ytl-dependency-audit.csv',
  );
  writeFileSync(outPath, formatMalaysiaV3YtlDependencyCsv(report), 'utf8');
  console.log(`\nCSV: ${outPath}`);
}

void main();
