import type { OcrTransactionRow } from '../../types/rakutenImport';

export type OcrVisionErrorCode =
  | 'no_api_key'
  | 'invalid_key'
  | 'load_failed'
  | 'timeout'
  | 'network'
  | 'bad_json'
  | 'empty_rows'
  | 'image_read_failed';

export type OcrVisionResult =
  | { ok: true; rows: OcrTransactionRow[] }
  | { ok: false; error: string; code: OcrVisionErrorCode };
