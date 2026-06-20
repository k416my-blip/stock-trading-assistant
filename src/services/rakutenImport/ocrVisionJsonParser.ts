import type { OcrTransactionRow } from '../../types/rakutenImport';

export type OcrVisionErrorCode =
  | 'bad_json'
  | 'empty_rows';

export type OcrVisionParseResult =
  | { ok: true; rows: OcrTransactionRow[] }
  | { ok: false; error: string; code: OcrVisionErrorCode };

function stripJsonFence(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

function isValidRow(row: unknown): row is OcrTransactionRow {
  if (!row || typeof row !== 'object') return false;
  const r = row as OcrTransactionRow;
  return typeof r.type === 'string';
}

/** Parse and validate Vision JSON — no native deps (unit-test safe). */
export function parseOcrVisionJson(raw: string): OcrVisionParseResult {
  try {
    const parsed = JSON.parse(stripJsonFence(raw)) as
      | { rows?: OcrTransactionRow[] }
      | OcrTransactionRow[];
    const rows = Array.isArray(parsed) ? parsed : parsed?.rows;
    if (!Array.isArray(rows) || rows.length === 0) {
      return { ok: false, error: '取引行が検出されませんでした。', code: 'empty_rows' };
    }
    const valid = rows.filter(isValidRow);
    if (valid.length === 0) {
      return { ok: false, error: 'OCR結果の形式が不正です。', code: 'bad_json' };
    }
    return { ok: true, rows: valid };
  } catch {
    return { ok: false, error: 'OCR結果のJSON解析に失敗しました。', code: 'bad_json' };
  }
}
