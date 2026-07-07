# GitHub Pages Jekyll Build Fix Report

**Date:** 2026-07-07  
**Failed build:** pages build #92 (Jekyll "Build with Jekyll")  
**AAB:** 未作成

## Root cause

Build #92 failed in **GitHub Pages standard Jekyll pipeline** (`Build with Jekyll`), not in our custom workflow.

Our repo already has `.github/workflows/pages.yml` which:
- copies **only** `docs/pages/` to `_site`
- uses `actions/upload-pages-artifact` + `actions/deploy-pages`
- does **not** use `actions/jekyll-build-pages`

**Likely reason Jekyll ran:** GitHub repo **Settings → Pages → Build and deployment → Source** is still set to **Deploy from a branch** (e.g. `/docs` or `/ (root)`), which triggers the legacy Jekyll builder. That runs in parallel/conflict with the Actions workflow.

## Required Pages setting (manual)

1. GitHub → **Settings → Pages**
2. **Build and deployment → Source:** select **GitHub Actions** (not "Deploy from a branch")
3. Save

Until this is changed, Jekyll builds (#92-style) may continue to fail even when `pages.yml` is correct.

## Workflow fix (this commit)

File: `.github/workflows/pages.yml`

Changes:
- Added `touch _site/.nojekyll` after rsync so GitHub serves static files without Jekyll processing
- Confirmed no `actions/jekyll-build-pages` step
- Artifact remains `docs/pages/` only (HTML, MD, minimal screenshots)

## Artifact size (local estimate)

- Files: 12  
- Size: ~615 KB (under 50 MB gate)

## Pages URL

https://k416my-blip.github.io/stock-trading-assistant/

(Verify after Settings → GitHub Actions + successful workflow run)

## Actions re-run

Push to `cursor/top3-maxdd-capital-audit` with changes under `docs/pages/**` or `.github/workflows/pages.yml` triggers `Deploy GitHub Pages` workflow.

Manual re-run: Actions → **Deploy GitHub Pages** → **Run workflow**.

## Commit / push

*(filled after push)*

