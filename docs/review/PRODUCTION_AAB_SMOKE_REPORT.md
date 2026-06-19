# Production AAB Smoke Test Report

**実施日:** 2026-06-19  
**デバイス:** FYRWXSNNAIOR9DCM (Redmi Note 13 Pro / HyperOS)  
**対象 APK:** `artifacts/preview-v15.apk`（versionCode 15 · **interim** — production AAB 未生成）

---

## エグゼクティブサマリー

| 項目 | 結果 |
|------|------|
| production AAB 実機スモーク | **未実施** — AAB/APK（monitor 無効）未生成 |
| Interim スモーク（preview-v15） | **部分 PASS** |
| 総合判定 | **BLOCKED** — production flavor artifact 待ち |

---

## 1. 前提と制約

- EAS Free plan quota exhausted のため production AAB ビルド不可（`PRODUCTION_AAB_BUILD_REPORT.md` 参照）
- 本スモークは **同一署名・同一 package** の preview-v15 で **起動・安定性** を interim 確認
- **monitor 無効確認**は preview では `[12H-MONITOR]` が出るため **production ビルド後に再実施必須**

---

## 2. 確認項目

| # | 項目 | 期待（production） | Interim 結果 | 備考 |
|---|------|-------------------|--------------|------|
| 1 | 起動 | PASS | **PASS** | `com.assistant.stocktrading` foreground · UI 40KB+ |
| 2 | API キー保存 | PASS | **未検証** | UI 自動化スクリプト長時間ハング · run-as 不可（release） |
| 3 | `adb install -r` 後保持 | PASS | **未検証** | SecureStore probe `adbOk=false`（release ビルド） |
| 4 | 株価更新 | PASS | **未実施** | production AAB 待ち · 手動 UI タップ未完了 |
| 5 | AI 分析 | PASS | **未実施** | 同上 |
| 6 | クラッシュ | 0 FATAL | **PASS** | app package FATAL **0** |
| 7 | monitor 無効 | 0 行 | **N/A（preview）** | `[12H-MONITOR]` **10 行** — preview 想定内 |

---

## 3. 実施ログ

### 3.1 起動

```text
adb install -r artifacts/preview-v15.apk → Success
adb shell am start -n com.assistant.stocktrading/.MainActivity
UI dump: package=com.assistant.stocktrading · 40,787 bytes
```

### 3.2 logcat（起動後 ~75s）

| 指標 | 値 |
|------|-----|
| `[12H-MONITOR]` | **10** |
| `com.assistant.stocktrading` FATAL | **0** |
| `ReactNativeJS` boot | `[REAL_API_MODE] app_boot` 確認 |

### 3.3 SecureStore probe

```json
{"adbOk":false,"twelveDataApiKey":false,...}
```

release/preview APK では `run-as` による SecureStore.xml 直接読取不可 — **UI ベース persistence smoke が必要**。

---

## 4. 証跡

| ファイル | 内容 |
|----------|------|
| `docs/review/production-aab-smoke/launch-ui.xml` | 起動後 UI dump |
| `docs/review/production-aab-smoke/logcat-final.txt` | logcat 全文 |
| `scripts/verify-production-aab-smoke.mjs` | production AAB 用スモーク（artifact 取得後実行） |

**production AAB 取得後の実行:**

```powershell
$env:ANDROID_SERIAL="FYRWXSNNAIOR9DCM"
# AAB → universal APK（bundletool）または EAS apk profile (monitor=0)
node scripts/verify-production-aab-smoke.mjs path\to\app-release.apk
```

---

## 5. 判定

| 判定 | 内容 |
|------|------|
| **Interim** | 起動 OK · app FATAL 0 · preview monitor 10 行（期待通り） |
| **Production** | **BLOCKED** — monitor 無効 · API キー reinstall · 株価/AI は AAB 後 |

---

## GitHub sync

Commit: **71465f2**  
Push: **success** (`origin/cursor/top3-maxdd-capital-audit`)
