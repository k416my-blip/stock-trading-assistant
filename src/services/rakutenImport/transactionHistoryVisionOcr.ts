import * as FileSystem from 'expo-file-system';
import {
  AI_API_CHAT_URL,
  AI_API_MODEL,
  AI_API_TIMEOUT_MS,
  AI_ERROR_API_KEY_MISSING,
} from '../../constants/aiStrategy';
import { loadAiApiKeyWithTimeout } from '../aiApiKey';
import { isUsableApiKey, normalizeStoredApiKey } from '../apiKeyValidation';
import { parseOcrVisionJson } from './ocrVisionJsonParser';
import type { OcrVisionResult } from './ocrVisionTypes';

export type { OcrVisionErrorCode, OcrVisionResult } from './ocrVisionTypes';
export { parseOcrVisionJson } from './ocrVisionJsonParser';

export const OCR_VISION_TIMEOUT_MS = AI_API_TIMEOUT_MS;

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

function extractResponsesApiText(data: unknown): string | null {
  const payload = data as {
    output_text?: string;
    output?: Array<{
      type?: string;
      content?: Array<{ type?: string; text?: string }>;
    }>;
  };

  if (typeof payload.output_text === 'string' && payload.output_text.trim()) {
    return payload.output_text;
  }

  for (const item of payload.output ?? []) {
    if (item.type !== 'message') continue;
    for (const part of item.content ?? []) {
      const text = part.text?.trim();
      if (!text) continue;
      if (part.type === 'output_text' || part.type === 'text') {
        return text;
      }
    }
  }
  return null;
}

export async function loadImageBase64FromUri(uri: string): Promise<string> {
  return FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
}

function mimeFromUri(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

export type RunTransactionHistoryVisionOcrOptions = {
  apiKey?: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
  loadBase64?: (uri: string) => Promise<string>;
};

export async function runTransactionHistoryVisionOcr(
  imageUri: string,
  options?: RunTransactionHistoryVisionOcrOptions,
): Promise<OcrVisionResult> {
  const fetchImpl = options?.fetchImpl ?? fetch;
  const timeoutMs = options?.timeoutMs ?? OCR_VISION_TIMEOUT_MS;
  const loadBase64 = options?.loadBase64 ?? loadImageBase64FromUri;

  let apiKey = options?.apiKey?.trim() ?? '';
  if (!apiKey) {
    const loaded = await loadAiApiKeyWithTimeout(5_000);
    if (loaded.failed) {
      return { ok: false, error: 'APIキーの読み込みに失敗しました。', code: 'load_failed' };
    }
    apiKey = normalizeStoredApiKey(loaded.key);
  }

  if (!isUsableApiKey(apiKey)) {
    return {
      ok: false,
      error: AI_ERROR_API_KEY_MISSING,
      code: 'no_api_key',
    };
  }

  let base64: string;
  try {
    base64 = await loadBase64(imageUri);
  } catch {
    return { ok: false, error: '画像の読み込みに失敗しました。', code: 'image_read_failed' };
  }

  const mime = mimeFromUri(imageUri);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(AI_API_CHAT_URL, {
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
              {
                type: 'input_image',
                image_url: `data:${mime};base64,${base64}`,
              },
            ],
          },
        ],
        max_output_tokens: 2048,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        return { ok: false, error: 'APIキーが無効です。', code: 'invalid_key' };
      }
      return { ok: false, error: 'OCR API通信に失敗しました。', code: 'network' };
    }

    const data = await response.json();
    const text = extractResponsesApiText(data);
    if (!text) {
      return { ok: false, error: 'OCR結果の形式が不正です。', code: 'bad_json' };
    }
    return parseOcrVisionJson(text);
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') {
      return { ok: false, error: 'OCRがタイムアウトしました。', code: 'timeout' };
    }
    return { ok: false, error: 'OCR API通信に失敗しました。', code: 'network' };
  } finally {
    clearTimeout(timer);
  }
}
