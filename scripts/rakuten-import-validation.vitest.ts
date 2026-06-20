/**
 * Rakuten Import Validation runner (vitest — avoids expo/react-native in tsx).
 * Invoked by: node scripts/rakuten-import-validation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

import { AI_API_CHAT_URL, AI_API_MODEL } from '../src/constants/aiStrategy';
import { buildOcrImportBatch } from '../src/services/rakutenImport/buildOcrImportBatch';
import { buildNaturalLanguageImportCandidate } from '../src/services/rakutenImport/buildNaturalLanguageImportCandidate';
import { parseNaturalLanguageTransaction } from '../src/services/rakutenImport/naturalLanguageTransactionParser';
import { ocrRowToCandidateFields } from '../src/services/rakutenImport/ocrRowToCandidate';
import { parseOcrVisionJson } from '../src/services/rakutenImport/ocrVisionJsonParser';
import { canSaveImportCandidate } from '../src/services/rakutenImport/rakutenImportConfidence';
import { createDefaultAppState } from '../src/services/storage';
import type { AppState } from '../src/types';
import type { OcrTransactionRow, OcrVisionResult } from '../src/services/rakutenImport/ocrVisionTypes';

const require = createRequire(import.meta.url);
const { loadAuditApiKeys } = require('./loadAuditApiKeys.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/review/rakuten-import-validation');
const FIXTURES_DIR = path.join(OUT_DIR, 'fixtures');
const MANIFEST_PATH = path.join(FIXTURES_DIR, 'manifest.json');

const OCR_SYSTEM_PROMPT = `You extract structured rows from Rakuten Trade "Transaction History" mobile app screenshots.
Return JSON only with this schema:
{
  "rows": [
    {
      "type": "deposit|withdrawal|buy|sell|dividend|fee",
      "date": "YYYY-MM-DD or DD/MM/YYYY",
      "symbol": "4-digit Bursa code or ticker",
      "company": "company name if visible",
      "quantity": number,
      "price": number,
      "fee": number,
      "total": number,
      "currency": "MYR|USD|HKD",
      "referenceNumber": "string",
      "confidence": 0.0-1.0,
      "fieldConfidence": {
        "type": 0.0-1.0,
        "executedAt": 0.0-1.0,
        "symbol": 0.0-1.0,
        "quantity": 0.0-1.0,
        "price": 0.0-1.0,
        "fee": 0.0-1.0,
        "total": 0.0-1.0,
        "currency": 0.0-1.0,
        "referenceNumber": 0.0-1.0
      }
    }
  ]
}
Include every visible transaction row. Use lowercase type values. Omit unknown fields rather than guessing.`;

type FieldKey = 'date' | 'symbol' | 'quantity' | 'price' | 'fee' | 'total' | 'currency';
type FieldVerdict = '正解' | '誤認識' | '未取得';

type GroundTruthRow = {
  type?: string;
  date?: string;
  symbol?: string;
  quantity?: number;
  price?: number;
  fee?: number;
  total?: number;
  currency?: string;
};

type ManifestFixture = {
  id: string;
  filename: string;
  expectedRows: GroundTruthRow[];
};

const DUPLICATE_MOCK_VISION: OcrVisionResult = {
  ok: true,
  rows: [
    {
      type: 'deposit',
      date: '2026-06-15',
      total: 500,
      currency: 'MYR',
      referenceNumber: 'REF-DUP-VAL-1',
      confidence: 0.92,
    },
    {
      type: 'buy',
      date: '2026-06-14',
      symbol: '1155',
      quantity: 100,
      price: 9.2,
      fee: 8,
      total: 928,
      currency: 'MYR',
      confidence: 0.88,
    },
  ],
};

const NL_PHRASES = [
  { phrase: '500リンギット入金した', expected: { type: 'deposit', totalMYR: 500, saveable: true } },
  { phrase: 'MaybankをRM9.20で100株買った', expected: { type: 'buy', symbol: '1155', quantity: 100, price: 9.2, saveable: true } },
  { phrase: 'Maybankの配当がRM50入った', expected: { type: 'dividend', symbol: '1155', totalMYR: 50, saveable: true } },
  { phrase: 'RM500 withdrawal', expected: { type: 'withdrawal', totalMYR: 500, saveable: true } },
];

function gitHead(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: ROOT, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

function loadManifest(): { fixtures: ManifestFixture[]; collectionSummary?: Record<string, unknown> } {
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
}

function extractResponsesApiText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string }> }>;
  };
  if (typeof payload.output_text === 'string' && payload.output_text.trim()) return payload.output_text;
  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      const text = part.text?.trim();
      if (text && (part.type === 'output_text' || part.type === 'text')) return text;
    }
  }
  return null;
}

function mimeFromPath(p: string): string {
  const lower = p.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

async function runVisionOcrOnFile(
  imagePath: string,
  apiKey: string,
): Promise<OcrVisionResult | { ok: false; error: string; code: string; rawRows?: OcrTransactionRow[] }> {
  const base64 = fs.readFileSync(imagePath, { encoding: 'base64' });
  const mime = mimeFromPath(imagePath);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 90_000);
  try {
    const response = await fetch(AI_API_CHAT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: AI_API_MODEL,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: OCR_SYSTEM_PROMPT },
              { type: 'input_image', image_url: `data:${mime};base64,${base64}` },
            ],
          },
        ],
        max_output_tokens: 2048,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, error: 'OCR API通信に失敗しました。', code: 'network' };
    }
    const data = await response.json();
    const text = extractResponsesApiText(data);
    if (!text) return { ok: false, error: 'OCR結果の形式が不正です。', code: 'bad_json' };

    const parsed = parseOcrVisionJson(text);
    if (parsed.ok) return parsed;

    if (parsed.code === 'empty_rows') {
      return { ok: false, error: parsed.error, code: 'empty_rows', rawRows: [] };
    }
    return { ok: false, error: parsed.error, code: parsed.code };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'OCRがタイムアウトしました。', code: 'timeout' };
    }
    return { ok: false, error: 'OCR API通信に失敗しました。', code: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDate(raw?: string): string | undefined {
  if (!raw) return undefined;
  const iso = raw.trim().match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = raw.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return raw.trim();
}

function numClose(a: number | undefined, b: number | undefined, tol = 0.02): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) <= tol;
}

function compareField(
  key: FieldKey,
  expected: GroundTruthRow,
  actual: Record<FieldKey, string | number | undefined>,
): FieldVerdict {
  const expRaw = expected[key as keyof GroundTruthRow];
  const actRaw = actual[key];
  if (expRaw == null || expRaw === '') return actRaw == null || actRaw === '' ? '正解' : '誤認識';
  if (actRaw == null || actRaw === '') return '未取得';
  if (key === 'date') return normalizeDate(String(expRaw)) === normalizeDate(String(actRaw)) ? '正解' : '誤認識';
  if (key === 'symbol' || key === 'currency') {
    return String(expRaw).trim().toUpperCase() === String(actRaw).trim().toUpperCase() ? '正解' : '誤認識';
  }
  const expNum = typeof expRaw === 'number' ? expRaw : parseFloat(String(expRaw));
  const actNum = typeof actRaw === 'number' ? actRaw : parseFloat(String(actRaw));
  return numClose(expNum, actNum) ? '正解' : '誤認識';
}

function extractCandidateFields(row: OcrTransactionRow): Record<FieldKey, string | number | undefined> {
  const partial = ocrRowToCandidateFields(row, { candidateId: 'cmp', batchId: 'batch' });
  return {
    date: partial?.executedAt ?? normalizeDate(row.date),
    symbol: partial?.symbol ?? row.symbol,
    quantity: partial?.quantity ?? row.quantity,
    price: partial?.price ?? row.price,
    fee: partial?.fee ?? row.fee,
    total: partial?.totalMYR ?? row.total,
    currency: partial?.currency ?? row.currency,
  };
}

function pct(n: number, total: number): string {
  return total === 0 ? '—' : `${((n / total) * 100).toFixed(1)}%`;
}

async function runOcrValidation(apiKey: string | undefined) {
  const manifest = loadManifest();
  const comparisons: Array<Record<string, unknown>> = [];

  if (!apiKey) {
    return {
      blocked: true,
      reason: 'OPENAI_API_KEY missing or invalid',
      fixtures: manifest.fixtures.map((f) => ({ fixtureId: f.id, filename: f.filename, skipped: true })),
      fieldStats: null,
      collectionSummary: manifest.collectionSummary ?? null,
    };
  }

  for (const fixture of manifest.fixtures) {
    const imagePath = path.join(FIXTURES_DIR, fixture.filename);
    if (!fs.existsSync(imagePath)) {
      comparisons.push({
        fixtureId: fixture.id,
        filename: fixture.filename,
        ocrOk: false,
        ocrError: 'fixture file missing',
        expectedRowCount: fixture.expectedRows.length,
        actualRowCount: 0,
        emptyScreenMatch: false,
        rowComparisons: [],
        hallucinatedRows: 0,
      });
      continue;
    }

    const ocr = await runVisionOcrOnFile(imagePath, apiKey);
    const expectedRows = fixture.expectedRows;

    if (!ocr.ok) {
      const emptyMatch = expectedRows.length === 0 && ocr.code === 'empty_rows';
      comparisons.push({
        fixtureId: fixture.id,
        filename: fixture.filename,
        ocrOk: emptyMatch,
        ocrError: emptyMatch ? undefined : ocr.error,
        ocrCode: ocr.code,
        expectedRowCount: expectedRows.length,
        actualRowCount: 0,
        emptyScreenMatch: emptyMatch,
        rowComparisons: [],
        hallucinatedRows: 0,
        pipelineNote: emptyMatch
          ? 'parseOcrVisionJson は empty_rows で失敗 — 空画面は正しく 0 行だが buildOcrImportBatch 経路ではエラーになる'
          : undefined,
      });
      continue;
    }

    const rowComparisons: Array<{ rowIndex: number; type?: string; fields: Record<FieldKey, FieldVerdict> }> = [];
    const pairCount = Math.max(expectedRows.length, ocr.rows.length);
    for (let i = 0; i < pairCount; i++) {
      const expected = expectedRows[i];
      const row = ocr.rows[i];
      if (!expected && row) {
        rowComparisons.push({
          rowIndex: i,
          type: row.type,
          fields: Object.fromEntries(
            (['date', 'symbol', 'quantity', 'price', 'fee', 'total', 'currency'] as FieldKey[]).map((k) => [k, '誤認識']),
          ) as Record<FieldKey, FieldVerdict>,
        });
        continue;
      }
      if (expected && !row) {
        rowComparisons.push({
          rowIndex: i,
          type: expected.type,
          fields: Object.fromEntries(
            (['date', 'symbol', 'quantity', 'price', 'fee', 'total', 'currency'] as FieldKey[]).map((k) => [k, '未取得']),
          ) as Record<FieldKey, FieldVerdict>,
        });
        continue;
      }
      if (!expected || !row) continue;
      const actual = extractCandidateFields(row);
      const fields = Object.fromEntries(
        (['date', 'symbol', 'quantity', 'price', 'fee', 'total', 'currency'] as FieldKey[]).map((k) => [
          k,
          compareField(k, expected, actual),
        ]),
      ) as Record<FieldKey, FieldVerdict>;
      rowComparisons.push({ rowIndex: i, type: expected.type ?? row.type, fields });
    }

    comparisons.push({
      fixtureId: fixture.id,
      filename: fixture.filename,
      ocrOk: true,
      expectedRowCount: expectedRows.length,
      actualRowCount: ocr.rows.length,
      emptyScreenMatch: expectedRows.length === 0 && ocr.rows.length === 0,
      rowComparisons,
      hallucinatedRows: Math.max(0, ocr.rows.length - expectedRows.length),
    });
  }

  const keys: FieldKey[] = ['date', 'symbol', 'quantity', 'price', 'fee', 'total', 'currency'];
  const fieldStats = Object.fromEntries(
    keys.map((k) => [k, { 正解: 0, 誤認識: 0, 未取得: 0, total: 0 }]),
  ) as Record<FieldKey, { 正解: number; 誤認識: number; 未取得: number; total: number }>;

  for (const cmp of comparisons.flatMap((c) => (c.rowComparisons as typeof rowComparisons) ?? [])) {
    for (const key of keys) {
      const v = cmp.fields[key];
      fieldStats[key][v] += 1;
      fieldStats[key].total += 1;
    }
  }

  return {
    blocked: false,
    ranAt: new Date().toISOString(),
    commitHash: gitHead(),
    apiKeySource: loadAuditApiKeys().sources.openai,
    fixtures: comparisons,
    fieldStats,
    fieldStatsPct: Object.fromEntries(
      Object.entries(fieldStats).map(([k, v]) => [
        k,
        { 正解: pct(v.正解, v.total), 誤認識: pct(v.誤認識, v.total), 未取得: pct(v.未取得, v.total) },
      ]),
    ),
    collectionSummary: manifest.collectionSummary ?? null,
  };
}

function runNlValidation() {
  const state = createDefaultAppState();
  const results = NL_PHRASES.map(({ phrase, expected }) => {
    const parsed = parseNaturalLanguageTransaction(phrase, { state });
    const parseOk = !('ok' in parsed && parsed.ok === false);
    const built = buildNaturalLanguageImportCandidate(phrase, { state });

    let actual: Record<string, unknown> = {};
    let saveable = false;
    if (parseOk && 'type' in parsed) {
      actual = {
        type: parsed.type,
        symbol: parsed.symbol,
        quantity: parsed.quantity,
        price: parsed.price,
        totalMYR: parsed.totalMYR,
        overallConfidence: parsed.overallConfidence,
      };
      saveable = canSaveImportCandidate({
        id: 'nl',
        batchId: 'b',
        source: 'natural_language',
        type: parsed.type,
        status: 'draft',
        executedAt: parsed.executedAt,
        symbol: parsed.symbol,
        companyName: parsed.companyName,
        market: parsed.market,
        currency: parsed.currency,
        quantity: parsed.quantity,
        price: parsed.price,
        fee: parsed.fee,
        totalMYR: parsed.totalMYR,
        fieldConfidence: parsed.fieldConfidence,
        overallConfidence: parsed.overallConfidence,
        lowConfidenceFields: parsed.lowConfidenceFields,
        createdAt: new Date().toISOString(),
      });
    }

    const pass =
      parseOk &&
      built.ok &&
      actual.type === expected.type &&
      (expected.symbol == null || actual.symbol === expected.symbol) &&
      (expected.quantity == null || actual.quantity === expected.quantity) &&
      (expected.price == null || actual.price === expected.price) &&
      (expected.totalMYR == null || actual.totalMYR === expected.totalMYR) &&
      saveable === expected.saveable;

    return {
      phrase,
      pass,
      expected,
      actual,
      saveable,
      buildOk: built.ok,
      buildStatus: built.ok ? built.candidate.status : undefined,
      duplicateHint: built.ok ? built.candidate.duplicateHint ?? null : null,
    };
  });

  return {
    ranAt: new Date().toISOString(),
    commitHash: gitHead(),
    passCount: results.filter((r) => r.pass).length,
    total: results.length,
    results,
  };
}

function stateAfterFirstBatchCommitted(
  state: AppState,
  batch: { candidates: Array<{ type: string; executedAt?: string; totalMYR?: number; symbol?: string; quantity?: number; price?: number; fee?: number; referenceNumber?: string }> },
): AppState {
  const next = structuredClone(state);
  for (const c of batch.candidates) {
    if (c.type === 'deposit' && c.totalMYR != null && c.executedAt) {
      next.deposits.push({
        id: `dep-${c.referenceNumber ?? 'dup'}`,
        amountMYR: c.totalMYR,
        plannedDate: c.executedAt.slice(0, 10),
        completed: true,
        note: c.referenceNumber ? `ref:${c.referenceNumber}` : 'rakuten-import-validation',
      });
    }
    if (c.type === 'buy' && c.symbol && c.quantity != null && c.price != null && c.executedAt) {
      next.trades.push({
        id: `trade-${c.symbol}-dup`,
        symbol: c.symbol,
        market: 'bursa',
        currency: 'MYR',
        side: 'buy',
        shares: c.quantity,
        price: c.price,
        brokerageFee: c.fee ?? 0,
        executedAt: c.executedAt.includes('T') ? c.executedAt : `${c.executedAt}T12:00:00.000Z`,
      });
    }
  }
  return next;
}

async function runDuplicateValidation() {
  const imageUri = 'file:///mock/duplicate-validation.jpg';
  const emptyState = createDefaultAppState();

  const first = await buildOcrImportBatch(imageUri, { state: emptyState }, {
    visionOcr: async () => DUPLICATE_MOCK_VISION,
  });
  if (!first.ok) return { pass: false, error: first.error, firstPass: null, secondPass: null };

  const populated = stateAfterFirstBatchCommitted(emptyState, first.batch);
  const second = await buildOcrImportBatch(imageUri, { state: populated }, {
    visionOcr: async () => DUPLICATE_MOCK_VISION,
  });
  if (!second.ok) return { pass: false, error: second.error, firstPass: null, secondPass: null };

  const firstHints = first.batch.candidates.map((c) => ({
    type: c.type,
    status: c.status,
    duplicateHint: c.duplicateHint ?? null,
  }));
  const secondHints = second.batch.candidates.map((c) => ({
    type: c.type,
    status: c.status,
    duplicateHint: c.duplicateHint ?? null,
    blockSave: c.status === 'duplicate_blocked',
  }));

  const depositDup = secondHints.find((c) => c.type === 'deposit');
  const buyDup = secondHints.find((c) => c.type === 'buy');
  const pass =
    firstHints.every((c) => !c.duplicateHint) &&
    depositDup?.duplicateHint != null &&
    depositDup.blockSave === true &&
    buyDup?.duplicateHint != null &&
    buyDup.blockSave === true;

  return {
    ranAt: new Date().toISOString(),
    commitHash: gitHead(),
    pass,
    firstPass: { candidateCount: first.batch.candidates.length, candidates: firstHints },
    secondPass: { candidateCount: second.batch.candidates.length, candidates: secondHints },
  };
}

describe('rakuten import validation runner', () => {
  it('writes OCR / NL / duplicate JSON artifacts', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const keys = loadAuditApiKeys();

    const ocrResults = await runOcrValidation(keys.openai || undefined);
    fs.writeFileSync(path.join(OUT_DIR, 'ocr-results.json'), JSON.stringify(ocrResults, null, 2));

    const nlResults = runNlValidation();
    fs.writeFileSync(path.join(OUT_DIR, 'nl-results.json'), JSON.stringify(nlResults, null, 2));

    const duplicateResults = await runDuplicateValidation();
    fs.writeFileSync(path.join(OUT_DIR, 'duplicate-results.json'), JSON.stringify(duplicateResults, null, 2));

    expect(nlResults.passCount).toBe(nlResults.total);
    expect(duplicateResults.pass).toBe(true);
  });
});
