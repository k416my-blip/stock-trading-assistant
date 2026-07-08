/**
 * 銘柄コード入力の正規化 — 全角数字・英字を半角に変換（adb/IME 全角入力対策）
 */
const FW_DIGIT_START = 0xff10;
const FW_ASCII_START = 0xff01;
const FW_ASCII_END = 0xff5e;
const HW_ASCII_START = 0x21;

export function normalizeStockCodeInput(symbol: string): string {
  let out = '';
  for (const ch of symbol.trim()) {
    const code = ch.charCodeAt(0);
    if (code >= FW_DIGIT_START && code <= FW_DIGIT_START + 9) {
      out += String.fromCharCode(code - FW_DIGIT_START + 48);
      continue;
    }
    if (code >= FW_ASCII_START && code <= FW_ASCII_END) {
      out += String.fromCharCode(code - FW_ASCII_START + HW_ASCII_START);
      continue;
    }
    out += ch;
  }
  return out.toUpperCase();
}
