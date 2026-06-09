import type { BursaRedditFetchDiagnostics } from '../../types/bursaDisclosure';

export function logRedditFetchDiagnostics(
  stockCode: string,
  diagnostics: BursaRedditFetchDiagnostics,
): void {
  const methodLabel =
    diagnostics.fetchMethod === 'rss'
      ? 'Reddit RSS'
      : diagnostics.fetchMethod === 'oauth'
        ? 'Reddit OAuth API'
        : 'なし';

  console.log(
    '[Reddit]',
    JSON.stringify({
      stockCode,
      取得方法: methodLabel,
      取得件数: diagnostics.fetchedCount,
      有効件数: diagnostics.validCount,
      除外件数: diagnostics.excludedCount,
      Reddit信頼度: diagnostics.confidenceJa,
      Reddit投資材料信頼度: diagnostics.investmentConfidenceJa,
      Reddit品質警告: diagnostics.qualityWarningJa,
      取得URL: diagnostics.fetchUrl,
      検索語: diagnostics.searchQueries,
      oauthConfigured: diagnostics.oauthConfigured,
      errorReason: diagnostics.errorReason,
      topTitles: diagnostics.titles.slice(0, 5),
    }),
  );

  if (diagnostics.validCount > 0) {
    console.log(
      `Reddit RSS取得成功 — ${stockCode} · 取得${diagnostics.fetchedCount}件 / 有効${diagnostics.validCount}件 / 除外${diagnostics.excludedCount}件 · 投資材料信頼度${diagnostics.investmentConfidenceJa}`,
    );
  } else if (diagnostics.fetchedCount > 0) {
    console.log(
      `Reddit RSS品質低 — ${stockCode} · 取得${diagnostics.fetchedCount}件 / 有効0件 / 除外${diagnostics.excludedCount}件`,
    );
  } else {
    console.log(`Reddit RSS取得失敗 — ${stockCode} · ${diagnostics.errorReason ?? '記事0件'}`);
  }
}
