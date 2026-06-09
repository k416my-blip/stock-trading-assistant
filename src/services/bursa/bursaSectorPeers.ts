/**
 * KLSE Screener セクター別同業銘柄（Bursa 上場コード・Phase3）
 * 出典: KLSE Screener sector 分類に基づく既知銘柄リスト（HTML 取得対象）
 */
export type BursaSectorKey = 'Banking' | 'Chemicals' | 'Utilities' | 'Plantation' | 'Telecom';

const SECTOR_PEER_CODES: Record<BursaSectorKey, string[]> = {
  Banking: ['1155', '1023', '1295', '1066', '5819', '1015', '2488', '5185', '5258', '7054'],
  Chemicals: ['5183', '5008', '5106', '5243', '4324', '4596', '7170'],
  Utilities: ['5347', '7277', '9049', '5211'],
  Plantation: ['2445', '1961', '5285', '2089', '4863'],
  Telecom: ['6012', '5031', '0138'],
};

const SECTOR_ALIASES: Record<string, BursaSectorKey> = {
  banking: 'Banking',
  bank: 'Banking',
  chemicals: 'Chemicals',
  chemical: 'Chemicals',
  utilities: 'Utilities',
  utility: 'Utilities',
  plantation: 'Plantation',
  telecom: 'Telecom',
  telecommunications: 'Telecom',
};

export function resolveBursaSectorKey(sector: string | null): BursaSectorKey | null {
  if (!sector) return null;
  const key = sector.trim().toLowerCase();
  for (const [alias, resolved] of Object.entries(SECTOR_ALIASES)) {
    if (key.includes(alias)) return resolved;
  }
  return null;
}

export function getSectorPeerCodes(sector: string | null, stockCode: string): string[] {
  const key = resolveBursaSectorKey(sector);
  if (!key) return [normalizeCode(stockCode)];
  const codes = SECTOR_PEER_CODES[key];
  const self = normalizeCode(stockCode);
  const set = new Set([self, ...codes]);
  return [...set];
}

export function sectorDisplayJa(key: BursaSectorKey | null): string {
  if (!key) return 'データ未取得';
  const map: Record<BursaSectorKey, string> = {
    Banking: '銀行業',
    Chemicals: '化学業',
    Utilities: '公益事業',
    Plantation: 'プランテーション',
    Telecom: '通信業',
  };
  return map[key];
}

function normalizeCode(code: string): string {
  return code.replace(/\.KL$/i, '').trim();
}

export { SECTOR_PEER_CODES };
