/**
 * ライブ検証結果の HTML → PNG（実機スクショの代替レポート用）
 * node scripts/capture-daily-comment-verify-screenshot.mjs
 */
import fs from 'node:fs';
import { chromium } from 'playwright';

const data = {
  verifiedAt: new Date().toISOString(),
  note: 'refreshProactive パイプライン実 API（vitest live）— 実機 adb 未接続時の UI 再現',
  dailyTarget: { symbol: '1155', score: 60, action: 'watch', conflict: true, source: 'hybrid' },
  todaySummaryJa:
    'ポートフォリオスコア 60/100 · 保有 10 銘柄。 本日の強い銘柄は 1155・マレーシア（Malayan Banking Berhad）（1155、スコア 60）。',
  bestTodayTop3: [
    { rank: 1, symbol: '1155', finalScore: 60, action: 'watch', conflict: true },
    { rank: 2, symbol: 'VYM', finalScore: 53, action: 'hold', conflict: false },
    { rank: 3, symbol: '0820EA', finalScore: 50, action: 'hold', conflict: false },
  ],
};

const html = `<!DOCTYPE html>
<html lang="ja"><head><meta charset="UTF-8"/><style>
body{margin:0;background:#0f1419;color:#e2e8f0;font-family:system-ui,sans-serif;padding:16px}
.phone{max-width:420px;margin:0 auto;border:1px solid #3b82f6;border-radius:12px;padding:14px;background:#1a2332}
h1{font-size:16px;color:#3b82f6;margin:0 0 8px}
.meta{font-size:12px;color:#94a3b8;margin-bottom:10px}
.box{border-left:3px solid #3b82f6;background:rgba(59,130,246,.12);padding:10px;border-radius:8px;margin:10px 0;font-size:13px;line-height:1.5}
.tag{display:inline-block;background:#22c55e33;color:#4ade80;font-size:11px;padding:2px 8px;border-radius:8px;margin-left:6px}
.warn{color:#fbbf24;font-size:11px;margin-top:12px}
table{width:100%;font-size:12px;border-collapse:collapse;margin-top:8px}
td,th{padding:6px;border-bottom:1px solid #334155;text-align:left}
</style></head><body>
<div class="phone">
<h1>検証レポート · 本日のAIコメント / 強い銘柄</h1>
<div class="meta">${data.verifiedAt}<br/>${data.note}</div>
<div class="box">
<strong>本日のAIコメント</strong>（ホーム AiActionCenterPanel）<br/>
${data.todaySummaryJa}
</div>
<div class="box">
<strong>Metro [DAILY_COMMENT_TARGET]</strong><br/>
symbol=${data.dailyTarget.symbol} · score=${data.dailyTarget.score} · action=${data.dailyTarget.action} · conflict=${data.dailyTarget.conflict}
</div>
<table><tr><th>#</th><th>symbol</th><th>score</th><th>action</th><th>conflict</th></tr>
${data.bestTodayTop3.map((r) => `<tr><td>${r.rank}</td><td>${r.symbol}</td><td>${r.finalScore}</td><td>${r.action}</td><td>${r.conflict}</td></tr>`).join('')}
</table>
<p class="warn">実機スクリーンショット: adb devices 空のため未取得。接続後は node scripts/verify-home-daily-comment-device.mjs</p>
</div></body></html>`;

fs.mkdirSync('agent-tools', { recursive: true });
const htmlPath = 'agent-tools/daily-comment-verify-report.html';
fs.writeFileSync(htmlPath, html);

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 460, height: 720 } });
await page.goto(`file:///${process.cwd().replace(/\\/g, '/')}/${htmlPath}`);
await page.screenshot({ path: 'agent-tools/daily-comment-verify-report.png', fullPage: true });
await browser.close();
console.log('wrote', htmlPath, 'and agent-tools/daily-comment-verify-report.png');
