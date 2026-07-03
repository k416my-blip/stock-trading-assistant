# Test Report Summary / テスト評価サマリー

Checklist for **AI or human** evaluation (versionCode **44**).

## Smoke tests (15 min)

| # | Area | Pass criteria |
|---|------|---------------|
| 1 | Launch | No crash; language or home visible |
| 2 | Holdings | Positions or empty state; prices load or graceful error |
| 3 | Material | Source rows appear; skipped sources labeled |
| 4 | AI analyst | 15-block or loading/error; no crash |
| 5 | Manual order | Create/list; delete pending (v43+) |
| 6 | Settings | API diagnostics; no key leak in UI |
| 7 | Rakuten entry | Form validates; no broker API call |

## AI evaluation prompts

**Purpose and safety:** Does this app place real orders or connect to a broker API?

**Data honesty:** Classify each material field as live API, RSS, HTML parse, mock, or unavailable.

**Concierge quality:** Ask about a holding symbol; check confidence %, 15-item block, no fabricated prices.

**Manual workflow:** Trace Rakuten manual entry; confirm no automated execution.

## Sign-off template

Evaluator, date, versionCode 44, device, API keys Y/N, smoke PASS/FAIL, safety PASS/FAIL, overall APPROVE/REVISE/REJECT.
