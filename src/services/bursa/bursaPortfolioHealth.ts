/**
 * Bursa Phase 7 — ポートフォリオ健全性・投資家タイプ
 */
import type {
  BursaInvestorType,
  BursaPhase6RankedEntry,
  BursaPhase7PortfolioHealth,
} from '../../types/bursaDisclosure';
import type { PortfolioPosition } from '../../types';

const MISSING = 'データ未取得';
const LARGE_CAP_MYR = 10_000_000_000;

function clampScore(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function computePortfolioHealth(input: {
  holdings: PortfolioPosition[];
  rankedByCode: Map<string, BursaPhase6RankedEntry>;
}): BursaPhase7PortfolioHealth {
  const bursa = input.holdings.filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0);
  if (bursa.length === 0) {
    return {
      score: null,
      sectorBiasJa: 'Bursa 保有なし',
      dividendDependencyJa: MISSING,
      largeCapDependencyJa: MISSING,
      growthRatioJa: MISSING,
    };
  }

  const entries = bursa
    .map((h) => {
      const code = h.symbol.replace(/\.KL$/i, '').trim();
      return input.rankedByCode.get(code) ?? null;
    })
    .filter(Boolean) as BursaPhase6RankedEntry[];

  if (entries.length === 0) {
    return {
      score: null,
      sectorBiasJa: MISSING,
      dividendDependencyJa: MISSING,
      largeCapDependencyJa: MISSING,
      growthRatioJa: MISSING,
    };
  }

  const sectorWeights = new Map<string, number>();
  for (const e of entries) {
    const sec = e.sector ?? MISSING;
    sectorWeights.set(sec, (sectorWeights.get(sec) ?? 0) + 1);
  }
  const maxSector = [...sectorWeights.entries()].sort((a, b) => b[1] - a[1])[0];
  const maxSectorPct = maxSector ? (maxSector[1] / entries.length) * 100 : 0;

  const divScores = entries.map((e) => e.dividendAppeal).filter((v): v is number => v != null);
  const avgDiv =
    divScores.length > 0 ? divScores.reduce((a, b) => a + b, 0) / divScores.length : null;

  const largeCapCount = entries.filter(
    (e) => e.marketCap != null && e.marketCap >= LARGE_CAP_MYR,
  ).length;
  const largeCapPct = (largeCapCount / entries.length) * 100;

  const growthCount = entries.filter((e) => e.growth != null && e.growth >= 60).length;
  const growthPct = (growthCount / entries.length) * 100;

  let score = 100;
  if (maxSectorPct > 60) score -= 25;
  else if (maxSectorPct > 40) score -= 12;
  if (avgDiv != null && avgDiv > 75) score -= 10;
  if (largeCapPct > 80) score -= 8;
  if (growthPct < 20 && entries.length >= 2) score -= 10;
  if (growthPct > 70) score -= 5;

  return {
    score: clampScore(score),
    sectorBiasJa:
      maxSector != null
        ? `${maxSector[0]} ${maxSectorPct.toFixed(0)}%（${entries.length}銘柄中）`
        : MISSING,
    dividendDependencyJa:
      avgDiv != null ? `配当魅力平均 ${avgDiv.toFixed(0)}/100` : MISSING,
    largeCapDependencyJa: `大型株 ${largeCapPct.toFixed(0)}%（時価総額≥RM10B）`,
    growthRatioJa: `成長株 ${growthPct.toFixed(0)}%（成長スコア≥60）`,
  };
}

export function diagnoseInvestorType(input: {
  rankedByCode: Map<string, BursaPhase6RankedEntry>;
  holdings: PortfolioPosition[];
}): { type: BursaInvestorType | null; reasonJa: string } {
  const bursa = input.holdings.filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0);
  const entries = bursa
    .map((h) => input.rankedByCode.get(h.symbol.replace(/\.KL$/i, '').trim()))
    .filter(Boolean) as BursaPhase6RankedEntry[];

  if (entries.length === 0) {
    return { type: null, reasonJa: MISSING };
  }

  const avg = (key: keyof BursaPhase6RankedEntry): number | null => {
    const vals = entries
      .map((e) => e[key])
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
    return vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  };

  const div = avg('dividendAppeal');
  const growth = avg('growth');
  const value = avg('value');

  if (div != null && growth != null && value != null) {
    const max = Math.max(div, growth, value);
    if (max === div && div >= 65) {
      return { type: '高配当型', reasonJa: `保有銘柄の配当魅力平均 ${div.toFixed(0)}/100` };
    }
    if (max === growth && growth >= 65) {
      return { type: '成長型', reasonJa: `保有銘柄の成長性平均 ${growth.toFixed(0)}/100` };
    }
    if (max === value && value >= 65) {
      return { type: '割安型', reasonJa: `保有銘柄の割安度平均 ${value.toFixed(0)}/100` };
    }
    return {
      type: 'バランス型',
      reasonJa: `配当 ${div.toFixed(0)} · 成長 ${growth.toFixed(0)} · 割安 ${value.toFixed(0)}`,
    };
  }

  return { type: null, reasonJa: MISSING };
}

export function buildPortfolioReconstruction(input: {
  holdings: PortfolioPosition[];
  rankedTop: BursaPhase6RankedEntry[];
  replacementSuggestions: import('../../types/bursaDisclosure').BursaPhase6ReplacementSuggestion[];
  holdingDiagnoses: Array<{ symbol: string; judgment: string | null; companyName: string | null }>;
}): import('../../types/bursaDisclosure').BursaPhase7Reconstruction {
  const heldCodes = new Set(
    input.holdings
      .filter((h) => h.market === 'bursa' && (h.shares ?? 0) > 0)
      .map((h) => h.symbol.replace(/\.KL$/i, '').trim()),
  );

  const swapCandidates = input.replacementSuggestions.flatMap((s) =>
    s.candidates.slice(0, 1).map((c) => ({
      removeSymbol: s.heldSymbol,
      removeName: s.heldCompanyName,
      addSymbol: c.stockCode,
      addName: c.companyName,
      scoreDiff: c.scoreDiff,
      reasonJa: `スコア差 +${c.scoreDiff} · ランク ${c.rank}位`,
    })),
  );

  const addCandidates = input.rankedTop
    .filter((r) => !heldCodes.has(r.stockCode) && r.compositeScore != null)
    .slice(0, 8)
    .map((r) => ({
      stockCode: r.stockCode,
      companyName: r.companyName,
      score: r.compositeScore,
      rank: r.rank,
      reasonJa: `総合 ${r.rank}位 · スコア ${r.compositeScore}`,
    }));

  const removeCandidates = input.holdingDiagnoses
    .filter((d) => d.judgment === '売却候補' || d.judgment === '注意')
    .map((d) => {
      const ranked = input.rankedTop.find((r) => r.stockCode === d.symbol);
      return {
        stockCode: d.symbol,
        companyName: d.companyName,
        score: ranked?.compositeScore ?? null,
        rank: ranked?.rank ?? null,
        reasonJa: `総合判断: ${d.judgment ?? MISSING}`,
      };
    });

  return { swapCandidates, addCandidates, removeCandidates };
}
