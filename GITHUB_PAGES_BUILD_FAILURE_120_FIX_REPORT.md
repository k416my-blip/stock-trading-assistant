# GitHub Pages Build Failure #120 Fix Report

Generated: 2026-07-09T14:40+08:00

---

## Summary

| 項目 | 結果 |
|------|------|
| **最終判定** | **PASS** |
| 失敗 run | pages build and deployment **#120** |
| 成功 run（fix 後） | https://github.com/k416my-blip/stock-trading-assistant/actions/runs/28997483448 |
| fix commit | `6c179fb` |

---

## 根本原因

- **Job:** `build`（Jekyll Markdown 変換）
- **直接原因:** `docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN_REPORT.md` および `DEVICE_VERIFY_V44_E2E_FINAL_RERUN3_REPORT.md` に **不正 UTF-8 バイト**（`0x81` 混入、`e2 80 81` 等）が含まれ、Jekyll が変換できず失敗
- **Node.js 20 deprecated warning:** 直接原因ではない（ログ上は警告のみ）

---

## 修正内容

| ファイル | 内容 |
|----------|------|
| `docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN_REPORT.md` | UTF-8 正規化（orphan byte 除去 + em dash 修復） |
| `docs/review/DEVICE_VERIFY_V44_E2E_FINAL_RERUN3_REPORT.md` | 同上 |
| `scripts/fix-doc-encoding.mjs` | ドキュメント UTF-8 正規化ユーティリティ |
| `scripts/check-docs-utf8.mjs` | docs UTF-8 検査（git tracked 向けに運用可能） |

### UTF-8 変換方法

- git 上の blob を読み、UTF-8 バリデーション + orphan `0x81` スキップ + `e2 80 81` → `e2 80 94`（em dash）修復
- 出力は UTF-8 no BOM

---

## docs 横断チェック

| 対象 | 結果 |
|------|------|
| git tracked `docs/**/*.md`（DEVICE_VERIFY 2 件） | **PASS**（Jekyll 対象の失敗ファイルは修復済み） |
| git tracked テキストの残存問題 | `hyperos...dexdump-classes.dex.txt`、`phase12-5-long-run/runner-console.txt`、`production-aab-smoke/logcat-final.txt`（NUL/非 UTF-8）— **log/バイナリ系**。今回 #120 の直接原因ではない |
| `scripts/check-docs-utf8.mjs`（untracked docs 含む） | untracked docs の BOM で FAIL（Jekyll 対象外の untracked ファイル） |

---

## docs/.nojekyll

- **未追加**（意図的）
- `docs/pages/*.md` は Jekyll レンダリングが必要なため、`.nojekyll` は追加しない

---

## 大容量 logcat git 対象外確認

```text
git ls-files docs/review/twelve-hour-test/adb-logcat-final-20260709-091018.log
→ （空）

git check-ignore -v docs/review/twelve-hour-test/adb-logcat-final-20260709-091018.log
→ .gitignore:94:docs/review/twelve-hour-test/adb-logcat*.log
```

---

## push 後 Actions 結果

| run ID | commit | 結果 |
|--------|--------|------|
| 28997483448 | `4d79c8b` | **success**（build + deploy） |
| 28996982914 | `e733f59` | **success** |

Pages deploy: **成功**（fix 後の push で green）

---

## 残課題

- git tracked の log 系 `.txt` に NUL/非 UTF-8 残存（Jekyll が触る Markdown とは別）
- untracked docs の UTF-8 BOM（Pages ビルド対象外）
