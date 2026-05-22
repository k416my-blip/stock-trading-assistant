/**
 * X投稿センチメント — 取得テキストのルールベース分類（AI推測なし）
 */
import type {
  XAnomalyAlert,
  XAnomalyId,
  XRawPost,
  XSentimentLabel,
  XSentimentPct,
  XSentimentSnapshot,
} from '../types/xSentiment';

const PATTERNS: Record<XSentimentLabel, RegExp[]> = {
  panic: [
    /\b(crash|panic|selloff|sell[- ]?off|bankrupt|collapse|plunge|crisis|fear|dump)\b/i,
    /暴落|恐慌|危機|破綻|急落/i,
  ],
  hype: [
    /\b(moon|rocket|squeeze|yolo|lambo|100x|pump|to the moon|breakout|ath|parabolic)\b/i,
    /爆上げ|急騰|話題沸騰|バズ/i,
  ],
  bullish: [
    /\b(buy|bull|long|upgrade|beat|strong|growth|profit|rally|surge|outperform)\b/i,
    /買い|強気|上昇|好調|増益|買い増し/i,
  ],
  bearish: [
    /\b(sell|bear|short|downgrade|miss|weak|loss|cut|underperform|overvalued)\b/i,
    /売り|弱気|下落|減益|失望|下方修正/i,
  ],
  neutral: [],
};

const RUMOR = /\b(rumor|rumour|unconfirmed|heard|sources say|allegedly|噂|風説)\b/i;
const PUMP = /\b(pump|dump|moon|100x|guaranteed|easy money)\b/i;

const STOP_WORDS = new Set([
  'the',
  'a',
  'an',
  'and',
  'or',
  'for',
  'to',
  'of',
  'in',
  'on',
  'is',
  'are',
  'was',
  'were',
  'this',
  'that',
  'with',
  'from',
  'at',
  'by',
  'it',
  'as',
  'be',
  'has',
  'have',
  'had',
  'will',
  'would',
  'can',
  'could',
  'about',
  'into',
  'over',
  'after',
  'before',
  'not',
  'no',
  'but',
  'if',
  'so',
  'than',
  'too',
  'very',
  'just',
  'now',
  'only',
  'also',
  'https',
  'http',
  'rt',
]);

export function buildXSearchQuery(symbol: string, companyName?: string): string {
  const ticker = symbol.replace(/\.(KL|HK|US)$/i, '').trim();
  const parts: string[] = [];
  if (companyName?.trim()) {
    const name = companyName.trim();
    parts.push(/\s/.test(name) ? `"${name}"` : name);
  }
  if (ticker) parts.push(ticker);
  const unique = [...new Set(parts.filter(Boolean))];
  return `${unique.join(' OR ')} -is:retweet lang:en`;
}

export function classifyPostSentiment(text: string): XSentimentLabel {
  const scores: Record<XSentimentLabel, number> = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
    panic: 0,
    hype: 0,
  };
  for (const label of Object.keys(PATTERNS) as XSentimentLabel[]) {
    for (const re of PATTERNS[label]) {
      if (re.test(text)) scores[label] += 1;
    }
  }
  const ranked = (Object.entries(scores) as [XSentimentLabel, number][]).sort((a, b) => b[1] - a[1]);
  const top = ranked[0];
  if (!top || top[1] === 0) return 'neutral';
  if (top[0] === 'neutral') return 'neutral';
  return top[0];
}

function pctDistribution(counts: Record<XSentimentLabel, number>, total: number): XSentimentPct {
  const pct = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);
  return {
    bullish: pct(counts.bullish),
    bearish: pct(counts.bearish),
    neutral: pct(counts.neutral),
    panic: pct(counts.panic),
    hype: pct(counts.hype),
  };
}

export function extractTrendWords(posts: XRawPost[], limit = 6): string[] {
  const freq = new Map<string, number>();
  for (const p of posts) {
    const words = p.text
      .toLowerCase()
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[^\w\u3040-\u30ff\u4e00-\u9faf]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 4 && !STOP_WORDS.has(w) && !/^\d+$/.test(w));
    for (const w of words) {
      freq.set(w, (freq.get(w) ?? 0) + 1);
    }
  }
  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([w]) => w);
}

function detectAnomalies(
  posts: XRawPost[],
  sentimentPct: XSentimentPct,
  postSurgeRatePct: number | null,
): XAnomalyAlert[] {
  const alerts: XAnomalyAlert[] = [];
  const negPct = sentimentPct.bearish + sentimentPct.panic;
  if (posts.length >= 5 && negPct >= 55) {
    alerts.push({ id: 'negative_surge', labelJa: 'ネガティブ急増（bearish+panic が過半数）' });
  }
  if (postSurgeRatePct != null && postSurgeRatePct >= 120) {
    alerts.push({
      id: 'volume_surge',
      labelJa: `投稿数急増（前回比 +${Math.round(postSurgeRatePct)}%）`,
    });
  }
  const hypePosts = posts.filter((p) => classifyPostSentiment(p.text) === 'hype' || PUMP.test(p.text)).length;
  if (posts.length >= 4 && (sentimentPct.hype >= 35 || hypePosts / posts.length >= 0.35)) {
    alerts.push({ id: 'pump_suspect', labelJa: 'pump疑惑（hype語彙が多い）' });
  }
  const rumorPosts = posts.filter((p) => RUMOR.test(p.text)).length;
  if (rumorPosts >= 2 || (posts.length >= 3 && rumorPosts / posts.length >= 0.25)) {
    alerts.push({ id: 'rumor_spread', labelJa: 'rumor拡散（未確認情報の言及）' });
  }
  return alerts;
}

function computeBuzzScore(sentimentPct: XSentimentPct, postCount: number): number {
  const engagement = Math.min(50, postCount * 3);
  const polarity = Math.abs(sentimentPct.bullish - sentimentPct.bearish);
  const stress = sentimentPct.panic + sentimentPct.hype * 0.5;
  return Math.min(100, Math.round(engagement + polarity * 0.3 + stress * 0.4));
}

function buildSummaryJa(
  postCount: number,
  sentimentPct: XSentimentPct,
  anomalies: XAnomalyAlert[],
): string {
  const dominant: XSentimentLabel = (Object.entries(sentimentPct) as [XSentimentLabel, number][]).sort(
    (a, b) => b[1] - a[1],
  )[0][0];
  const domJa: Record<XSentimentLabel, string> = {
    bullish: '強気',
    bearish: '弱気',
    neutral: '中立',
    panic: 'パニック',
    hype: '過熱',
  };
  const anomalyNote = anomalies.length > 0 ? ` · 異常${anomalies.length}件` : '';
  return (
    `X投稿${postCount}件を分析: 主調=${domJa[dominant]} ` +
    `(bull ${sentimentPct.bullish}% / bear ${sentimentPct.bearish}% / ` +
    `neu ${sentimentPct.neutral}% / panic ${sentimentPct.panic}% / hype ${sentimentPct.hype}%)${anomalyNote}`
  );
}

export function analyzePostsSentiment(input: {
  posts: XRawPost[];
  searchQuery: string;
  previousPostCount?: number | null;
  quotaRemainingToday: number;
  fromCache: boolean;
  fetchedAt: string;
}): XSentimentSnapshot {
  const posts = input.posts;
  const counts: Record<XSentimentLabel, number> = {
    bullish: 0,
    bearish: 0,
    neutral: 0,
    panic: 0,
    hype: 0,
  };
  for (const p of posts) {
    counts[classifyPostSentiment(p.text)] += 1;
  }
  const total = posts.length;
  const sentimentPct = pctDistribution(counts, total);
  let postSurgeRatePct: number | null = null;
  if (
    input.previousPostCount != null &&
    input.previousPostCount > 0 &&
    total > 0
  ) {
    postSurgeRatePct = Math.round(((total - input.previousPostCount) / input.previousPostCount) * 100);
  }
  const anomalies = detectAnomalies(posts, sentimentPct, postSurgeRatePct);
  const trendWords = extractTrendWords(posts);
  const buzzScore = computeBuzzScore(sentimentPct, total);

  return {
    postCount: total,
    sentimentPct,
    trendWords,
    postSurgeRatePct,
    anomalies,
    buzzScore,
    summaryJa: buildSummaryJa(total, sentimentPct, anomalies),
    searchQuery: input.searchQuery,
    analysisBasis: 'fetched_posts',
    fromCache: input.fromCache,
    quotaRemainingToday: input.quotaRemainingToday,
    fetchedAt: input.fetchedAt,
  };
}

export function sentimentSnapshotToLegacyRates(sentimentPct: XSentimentPct): {
  positiveRatePct: number;
  negativeRatePct: number;
} {
  return {
    positiveRatePct: sentimentPct.bullish + Math.round(sentimentPct.hype * 0.3),
    negativeRatePct: sentimentPct.bearish + sentimentPct.panic,
  };
}
