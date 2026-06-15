# FGS Phase 1 — 証跡収集 途中経過

作成: 2026-06-16  
状態: **v11 修正完了 · EAS ビルド待ち**

---

## 完了

- [x] v10 APK manifest 解析 → **LongRunForegroundService 不在**
- [x] 30m logcat / dumpsys 証跡整理
- [x] Gradle BOM 根本原因特定
- [x] `FGS_ROOT_CAUSE_REPORT.md` 作成
- [x] v11 修正: BOM 除去 · config plugin · POST_NOTIFICATIONS · versionCode 11

## 待ち

- [ ] EAS preview v11 ビルド
- [ ] v11 インストール + `collect-fgs-evidence.mjs`
- [ ] FGS 実稼働確認（aapt + STA-SURVIVAL + dumpsys）
- [ ] **1h screen-off テスト**（FGS ゲート PASS 後）

## 暫定結論

FGS FAIL は orchestrator バグではなく、**ネイティブモジュールが APK に含まれていなかった**ことが主因。
