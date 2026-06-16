/**
 * Analyze monitor event strings in a run-scoped logcat file.
 * Usage: node scripts/analyze-logcat-monitor-events.mjs [path-to-log]
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  countHeartbeat,
  countPriceUpdate,
  countNewsFetch,
  countSurvivalEvents,
} from './lib/hyperos-monitor-metrics.mjs';

const ROOT = process.cwd();
const defaultPath =
  'docs/review/hyperos-screen-off-survival/logcat-live-verify-20260616-193413.log';
const logPath = path.resolve(ROOT, process.argv[2] ?? defaultPath);

if (!fs.existsSync(logPath)) {
  console.error('File not found:', logPath);
  process.exit(1);
}

const raw = fs.readFileSync(logPath, 'utf8');
const lines = raw.split('\n');
const patterns = ['12H-MONITOR', 'heartbeat', 'price_update', 'news_fetch', 'survival_health_ok'];

console.log('file:', path.relative(ROOT, logPath));
console.log('bytes:', fs.statSync(logPath).size);
console.log('\n=== grep counts (substring) ===');
for (const p of patterns) {
  console.log(`${p}: ${lines.filter((l) => l.includes(p)).length}`);
}

console.log('\n=== orchestrator countMonitorEvent ===');
console.log('countHeartbeat:', countHeartbeat(raw));
console.log('countPriceUpdate:', countPriceUpdate(raw));
console.log('countNewsFetch:', countNewsFetch(raw));
console.log('countSurvivalEvents:', countSurvivalEvents(raw));

console.log('\n=== samples ===');
const sample = (pred, n = 3) =>
  lines.filter(pred).slice(0, n).forEach((l) => console.log(l.slice(0, 240)));
sample((l) => l.includes('12H-MONITOR'));
sample((l) => l.includes('heartbeat') && !l.includes('12H-MONITOR'));
sample((l) => l.includes('survival_health_ok'));
