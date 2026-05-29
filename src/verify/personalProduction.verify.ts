/**
 * npx tsx src/verify/personalProduction.verify.ts
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DEVICE_SMOKE_TEST_CHECKLIST } from '../constants/deviceSmokeTestChecklist';
import { runDailyHealthCheck } from '../services/dailyHealthCheckService';
import {
  exportPersonalBackupJson,
  validatePersonalBackupJson,
} from '../services/personalBackupService';
import {
  getPersonalKillSwitchesSnapshot,
  resetPersonalKillSwitchesForTest,
  savePersonalKillSwitches,
} from '../services/personalKillSwitches';
import { removePortfolioPosition } from '../services/portfolio';
import { createDefaultAppState } from '../services/storage';
import { createTestPosition } from '../../tests/helpers/fixtures/portfolio';

let failed = 0;
function fail(msg: string) {
  console.error(`✗ ${msg}`);
  failed += 1;
}
function pass(msg: string) {
  console.log(`✓ ${msg}`);
}

async function main() {
  resetPersonalKillSwitchesForTest();

  if (DEVICE_SMOKE_TEST_CHECKLIST.length >= 14) pass('device smoke checklist defined');
  else fail('smoke checklist incomplete');

  const backup = exportPersonalBackupJson(createDefaultAppState(), []);
  const validation = validatePersonalBackupJson(backup);
  if (validation.valid && !validation.corrupt) pass('backup export/import validation');
  else fail('backup validation failed');

  const report = await runDailyHealthCheck({
    state: createDefaultAppState(),
    hasApiKey: false,
  });
  if (report.items.length > 0) pass('health check runs');
  else fail('health check empty');

  await savePersonalKillSwitches({ readOnlyMode: true, disableMarketRefresh: true });
  const ks = getPersonalKillSwitchesSnapshot();
  if (ks.readOnlyMode && ks.disableMarketRefresh) pass('kill switches');
  else fail('kill switches not persisted');

  const { removed } = removePortfolioPosition([createTestPosition()], createTestPosition().id);
  if (removed) pass('remove holding helper');
  else fail('remove holding failed');

  if (existsSync(join(process.cwd(), 'docs/DEVICE_SMOKE_TEST_CHECKLIST.md'))) {
    pass('markdown smoke checklist exists');
  } else fail('markdown checklist missing');

  const appCtx = readFileSync(join(process.cwd(), 'src/context/AppContext.tsx'), 'utf8');
  if (appCtx.includes('disableMarketRefresh') && appCtx.includes('tradeBlockedReason')) {
    pass('read-only and trade gates in AppContext');
  } else fail('AppContext kill switch gates missing');

  const screen = readFileSync(join(process.cwd(), 'src/screens/PersonalProductionScreen.tsx'), 'utf8');
  if (screen.includes('ヘルスチェック') && screen.includes('killSwitches')) {
    pass('PersonalProductionScreen exists');
  } else fail('PersonalProductionScreen incomplete');

  const smokePanel = readFileSync(join(process.cwd(), 'src/components/DeviceSmokeTestPanel.tsx'), 'utf8');
  if (smokePanel.includes('全テスト実行') && smokePanel.includes('PASS')) {
    pass('device smoke test diagnostic panel');
  } else fail('DeviceSmokeTestPanel incomplete');

  readFileSync(join(process.cwd(), 'src/utils/confirmDestructive.ts'), 'utf8');
  pass('destructive confirmation helper');

  const portfolio = readFileSync(join(process.cwd(), 'src/screens/PortfolioScreen.tsx'), 'utf8');
  if (portfolio.includes('confirmDestructiveAction') && portfolio.includes('removeHolding')) {
    pass('delete holding confirmation');
  } else fail('portfolio delete guard missing');

  console.log(`\n${failed === 0 ? '✓' : '✗'} personal production verify`);
  if (failed > 0) process.exit(1);
}

void main();
