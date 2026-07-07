# OOM Stability Rerun Report

- **Timestamp**: 2026-07-07
- **AAB**: Not created (Build Credit saving)
- **E2E**: Stopped; bulk rerun5 disabled until Cursor < 5GB

## Cleanup
- Before: 4891 files / 202.75 MB
- After: 74 files / 0.17 MB
- Removed: 4818 files / 202.57 MB (PNG, XML, LOG, JSONL)

## Kept
- results-*.json summaries (rerun4/5/e2e)
- prune-summary.json

## New tooling
- `prune-device-verify-artifacts.mjs` — delete bulk media
- `run-v44-e2e-flow.mjs <flow>` — one flow per process
- `_deviceVerifyMemory.mjs` — gate: Cursor>5GB, system>80%

## Bulk E2E blocked
`run-v44-e2e-all.mjs --rerun5` exits unless E2E_ALLOW_BULK=1

## Memory post-prune
- Cursor: 5013 MB (above gate)
- node: 2677 MB
- adb: 14 MB
- System: 61.3%

## Git commit
See latest push on cursor/top3-maxdd-capital-audit
