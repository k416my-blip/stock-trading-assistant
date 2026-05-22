const BODY_PREVIEW_CHARS = 200;

export function responseBodyPreview(bodyText: string): string {
  const trimmed = bodyText.replace(/\s+/g, ' ').trim();
  if (trimmed.length <= BODY_PREVIEW_CHARS) return trimmed;
  return `${trimmed.slice(0, BODY_PREVIEW_CHARS)}…`;
}

export function isHtmlResponse(contentType: string, bodyText: string): boolean {
  const ct = contentType.toLowerCase();
  if (ct.includes('text/html')) return true;
  const head = bodyText.trim().slice(0, 200).toLowerCase();
  return head.startsWith('<!doctype') || head.startsWith('<html');
}

export function headersRecord(response: Response): Record<string, string> {
  const out: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

export function logHttpResponseDetail(params: {
  label: string;
  url: string;
  response: Response;
  bodyText: string;
  attempt?: number;
}): void {
  const contentType = params.response.headers.get('content-type') ?? '(none)';
  console.log(`[http-fetch:${params.label}] RESPONSE_DETAIL`, {
    attempt: params.attempt,
    url: params.url,
    status: params.response.status,
    ok: params.response.ok,
    contentType,
    headers: headersRecord(params.response),
    bodyPreview: responseBodyPreview(params.bodyText),
    isHtml: isHtmlResponse(contentType, params.bodyText),
  });
}

export function logHttpFetchError(params: {
  label: string;
  url: string;
  attempt: number;
  error: unknown;
}): void {
  console.log(`[http-fetch:${params.label}] FETCH_ERROR`, {
    attempt: params.attempt,
    url: params.url,
    error: params.error instanceof Error ? params.error.message : String(params.error),
  });
}
