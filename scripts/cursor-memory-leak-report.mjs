#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CURSOR_CATEGORIES, detectLeakSuspects } from './lib/cursorProcessMemory.mjs';
import { DEV_DIR } from './lib/devStatusCore.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const LOG_FILE = path.join(ROOT, DEV_DIR, 'cursor-memory-log.jsonl');
const REPORT_FILE = path.join(ROOT, DEV_DIR, 'cursor-memory-leak-report.json');

function readSamples() {
  if (!fs.existsSync(LOG_FILE)) return [];
  const lines = fs.readFileSync(LOG_FILE, 'utf8').split(/\r?\n/).filter(Boolean);
  const samples = [];
  for (const line of lines) {
    try {
      samples.push(JSON.parse(line));
    } catch {}
  }
  return samples;
}

function summarizeCategoryTrend(samples) {
  const keys = CURSOR_CATEGORIES.map((c) => c.key);
  const first = samples[0];
  const last = samples[samples.length - 1];
  const trends = [];
  for (const key of keys) {
    const a = first?.categories?.[key]?.totalMb ?? 0;
    const b = last?.categories?.[key]?.totalMb ?? 0;
    const growthPct = a > 0 ? Math.round(((b - a) / a) * 1000) / 10 : b > 0 ? 100 : 0;
    trends.push({
      key,
      label: first?.categories?.[key]?.label ?? key,
      firstMb: a,
      lastMb: b,
      growthPct,
    });
  }
  trends.sort((x, y) => y.lastMb - x.lastMb);
  return trends;
}

function main() {
  const samples = readSamples();
  const leak = detectLeakSuspects(samples);
  const categoryTrends = summarizeCategoryTrend(samples);
  const report = {
    generatedAt: new Date().toISOString(),
    logFile: LOG_FILE,
    sampleCount: samples.length,
    firstCapturedAt: samples[0]?.capturedAt ?? null,
    lastCapturedAt: samples[samples.length - 1]?.capturedAt ?? null,
    spanHours: leak.spanHours ?? 0,
    categoryTrends,
    leakSuspects: leak.suspects,
    insufficientSamples: leak.reason === 'insufficient_samples',
  };

  fs.mkdirSync(path.join(ROOT, DEV_DIR), { recursive: true });
  fs.writeFileSync(REPORT_FILE, JSON.stringify(report, null, 2) + '\n', 'utf8');

  console.log('\n=== npm run memory:leak-report ===');
  console.log(`Samples: ${report.sampleCount} (span ~${report.spanHours}h)`);
  if (report.insufficientSamples) {
    console.log('Need >=4 samples for leak detection. Run `npm run memory:log:daemon` for 4+ hours.');
  }

  console.log('\nCategory trends (first → last):');
  for (const t of categoryTrends) {
    if (t.firstMb === 0 && t.lastMb === 0) continue;
    console.log(`  ${t.label}: ${t.firstMb} → ${t.lastMb} MB (${t.growthPct >= 0 ? '+' : ''}${t.growthPct}%)`);
  }

  if (leak.suspects.length) {
    console.log('\nLeak suspects:');
    for (const s of leak.suspects) {
      console.log(
        `  PID ${s.pid} ${s.name} [${s.category}] ${s.firstMb}→${s.lastMb} MB (+${s.growthPct}%, slope ${s.slopeMbPerHour} MB/h)`,
      );
    }
  } else if (!report.insufficientSamples) {
    console.log('\nNo sustained leak suspects detected.');
  }

  console.log(`\nWrote ${REPORT_FILE}`);
}

main();
