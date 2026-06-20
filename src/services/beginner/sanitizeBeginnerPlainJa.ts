/** UX0.3 §4.2 — 投資専門語を中学レベル日本語へ置換 */
const BEGINNER_JARGON_REPLACEMENTS: [RegExp, string][] = [
  [/配当/g, 'お金の還元'],
  [/専門家評価|アナリスト/g, '外の評価'],
  [/決算|業績/g, '会社の成績'],
  [/株価|時価/g, '値段'],
  [/PER|PBR|バリュエーション/g, '割高か割安か'],
  [/ボラティリティ|変動率/g, '値段の上下'],
  [/マクロ|景気循環/g, '国の景気'],
  [/セクター|業種/g, '業界'],
  [/利上げ|金利/g, '借りるお金のコスト'],
  [/為替|FX/g, '外国のお金の値段'],
  [/売上高|利益率/g, '儲け'],
  [/Reddit|reddit/g, 'ネットの話題'],
  [/API|Phase\d+/g, '公開情報'],
  [/PER\b/g, '割高か割安か'],
];

const FORBIDDEN_PATTERNS = [
  /すべき/g,
  /必ず/g,
  /%/g,
];

export const BEGINNER_REASON_FALLBACKS: [string, string, string] = [
  '公開情報を見ても、大きな悪い話は今のところ少ないです',
  '値段とニュースに大きな変化は限られています',
  '急いで売買する必要はありません',
];

export const BEGINNER_WATCHPOINT_FALLBACKS: [string, string, string] = [
  '会社の成績発表の時期に注目してください',
  '借りるお金のコストのニュースに注意してください',
  '儲けが大きく減るニュースがないか確認してください',
];

const MAX_LEN = 48;

function ensurePeriod(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (/[。！？]$/.test(t)) return t;
  return `${t}。`;
}

export function sanitizeBeginnerPlainJa(line: string): string {
  let s = line.trim();
  if (!s) return '';

  for (const [re, rep] of BEGINNER_JARGON_REPLACEMENTS) {
    s = s.replace(re, rep);
  }

  for (const re of FORBIDDEN_PATTERNS) {
    s = s.replace(re, '');
  }

  s = s.replace(/\s+/g, ' ').trim();
  if (s.length > MAX_LEN) {
    s = s.slice(0, MAX_LEN).trim();
  }

  return ensurePeriod(s);
}

export function fillBeginnerReasons(candidates: string[]): [string, string, string] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    const line = sanitizeBeginnerPlainJa(raw);
    if (!line || seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const c of candidates) push(c);
  for (const fb of BEGINNER_REASON_FALLBACKS) {
    if (out.length >= 3) break;
    push(fb);
  }

  while (out.length < 3) {
    push(BEGINNER_REASON_FALLBACKS[out.length % 3]);
  }

  return [out[0], out[1], out[2]];
}

export function fillBeginnerWatchpoints(candidates: string[], max = 3): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const push = (raw: string) => {
    const line = sanitizeBeginnerPlainJa(raw);
    if (!line || seen.has(line)) return;
    seen.add(line);
    out.push(line);
  };

  for (const c of candidates) {
    if (out.length >= max) break;
    push(c);
  }

  for (const fb of BEGINNER_WATCHPOINT_FALLBACKS) {
    if (out.length >= max) break;
    push(fb);
  }

  if (out.length === 0) {
    push(BEGINNER_WATCHPOINT_FALLBACKS[0]);
  }

  return out.slice(0, max);
}
