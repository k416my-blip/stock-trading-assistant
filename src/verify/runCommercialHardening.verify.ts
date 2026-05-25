/**
 * Phase 1–2 商用ハードニング検証スイート
 * npx tsx src/verify/runCommercialHardening.verify.ts
 */
import { spawnSync } from 'child_process';
import { join } from 'path';

const ROOT = process.cwd();
const scripts = [
  'src/verify/portfolioRecovery.verify.ts',
  'src/verify/portfolioSnapshot.verify.ts',
  'src/verify/portfolioTransaction.verify.ts',
  'src/verify/appStatePersistence.verify.ts',
  'src/verify/staleDataMetadata.verify.ts',
  'src/verify/marketDataQueue.verify.ts',
  'src/verify/marketDataBoundary.verify.ts',
  'src/verify/portfolioStability.verify.ts',
  'src/verify/executionSafety.verify.ts',
  'src/verify/security.verify.ts',
];

let failed = 0;

for (const script of scripts) {
  const label = script.replace('src/verify/', '');
  console.log(`\n── ${label} ──`);
  const result = spawnSync('npx', ['tsx', join(ROOT, script)], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      NODE_OPTIONS: `${process.env.NODE_OPTIONS ?? ''} --require ${join(ROOT, 'scripts/react-native-stub-register.cjs')}`.trim(),
    },
  });
  if (result.status !== 0) {
    failed += 1;
  }
}

console.log(`\n${failed === 0 ? '✓' : '✗'} commercial hardening suite: ${scripts.length - failed}/${scripts.length} passed`);
if (failed > 0) process.exit(1);
