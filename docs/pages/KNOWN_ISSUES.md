# Known Issues / 既知の課題

**versionCode 44** — honest status for evaluators.

## Data and APIs

| Issue | Impact | Workaround |
|-------|--------|------------|
| KLSE HTML parse (not official Bursa API) | Some fields show データ未取得 | Retry; check network |
| Operating profit often missing | UI shows unavailable | Expected limitation |
| News API rate limits (429) | Material tab may skip News | RSS fallback; configure key |
| X API key required | X source skipped if unset | Settings, API keys |
| Reddit OAuth unused | RSS only, high filter rate | Normal for free tier |

## App and platform

| Issue | Notes |
|-------|-------|
| Expo Go | Local notifications disabled; use preview/dev build |
| Long-run / HyperOS | Background kill possible |
| Typecheck / some unit tests | Analysis test fixtures may fail CI |
| First-run language picker | Fixed in recent commits; verify on fresh install |

## Security and scope

- No secrets in GitHub Pages or this repo.
- No real orders — manual broker workflow only.
