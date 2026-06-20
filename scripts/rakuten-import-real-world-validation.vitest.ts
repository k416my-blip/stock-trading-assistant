/**
 * Rakuten Import Real-World Validation runner (vitest).
 * Invoked by: node scripts/rakuten-import-real-world-validation.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { describe, it, expect } from 'vitest';

import { AI_API_CHAT_URL, AI_API_MODEL } from '../src/constants/aiStrategy';
import { ocrRowToCandidateFields } from '../src/services/rakutenImport/ocrRowToCandidate';
import { parseOcrVisionJson } from '../src/services/rakutenImport/ocrVisionJsonParser';
import type { OcrTransactionRow, OcrVisionResult } from '../src/services/rakutenImport/ocrVisionTypes';

const require = createRequire(import.meta.url);
const { loadAuditApiKeys } = require('./loadAuditApiKeys.mjs');

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/review/rakuten-import-real-world');
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
  expectedScreenType?: string;
  expectedRows: GroundTruthRow[];
  notesJa?: string;
};

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

async function runRealWorldOcrValidation(apiKey: string | undefined) {
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
    const isNonApplicable = fixture.expectedScreenType === 'navigation';

    if (!fs.existsSync(imagePath)) {
      comparisons.push({
        fixtureId: fixture.id,
        filename: fixture.filename,
        nonApplicable: isNonApplicable,
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

    if (isNonApplicable) {
      comparisons.push({
        fixtureId: fixture.id,
        filename: fixture.filename,
        nonApplicable: true,
        notesJa: fixture.notesJa,
        ocrSkipped: true,
        expectedRowCount: 0,
        actualRowCount: 0,
        rowComparisons: [],
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
      rawOcrRows: ocr.rows,
    });
  }

  const keys: FieldKey[] = ['date', 'symbol', 'quantity', 'price', 'fee', 'total', 'currency'];
  const fieldStats = Object.fromEntries(
    keys.map((k) => [k, { 正解: 0, 誤認識: 0, 未取得: 0, total: 0 }]),
  ) as Record<FieldKey, { 正解: number; 誤認識: number; 未取得: number; total: number }>;

  for (const cmp of comparisons) {
    if (cmp.nonApplicable || cmp.ocrSkipped) continue;
    for (const rowCmp of (cmp.rowComparisons as typeof rowComparisons) ?? []) {
      for (const key of keys) {
        const v = rowCmp.fields[key];
        fieldStats[key][v] += 1;
        fieldStats[key].total += 1;
      }
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

describe('rakuten import real-world validation runner', () => {
  it('writes real-world OCR JSON artifacts', async () => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const keys = loadAuditApiKeys();

    const ocrResults = await runRealWorldOcrValidation(keys.openai || undefined);
    fs.writeFileSync(path.join(OUT_DIR, 'ocr-results.json'), JSON.stringify(ocrResults, null, 2));

    expect(ocrResults.blocked === false || ocrResults.reason).toBeTruthy();
  });
});
