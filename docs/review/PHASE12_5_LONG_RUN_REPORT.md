# Phase12.5 Long Run Validation Report

**ステータス:** COMPLETED
**開始:** 2026-07-08T12:54:35.323Z
**終了:** 2026-07-09T01:10:18.953Z
**経過:** 12h 15m
**計画時間:** 12 時間
**実機:** Redmi (adb)

## 総合判定: **PASS**（テスト本体）

### テスト本体 FAIL 条件（A）

| 条件 | 判定 | 結果 |
|------|------|------|
| クラッシュ0 | PASS | FATAL=0, undefined=0 |
| ANR0 | PASS | ANR=0 |
| プロセス消失0 | PASS | pidLost=0 |
| adb device | PASS | connected |
| Metro :8081 | PASS | LISTENING |
| 価格更新復帰 | PASS | 直近4回連続失敗でFAIL |

### WARN 条件（B — 本体FAILにしない）

| 条件 | 判定 | 結果 |
|------|------|------|
| logcat finalization | PASS | 0 件 |
| UI dump 保存 | PASS | 0 件 · timestamp 付き `ui-dump-*.xml` |
| 全銘柄UI表示 | WARN | adb UI card not found 等 |
| メモリ増加20%以内 | PASS | +2.9% |

### 検証銘柄

- 1155 Maybank
- 1023 CIMB
- 1295 Public Bank
- 5347 Tenaga
- 4707 Nestle
- 6033 Petronas Gas

### 1時間ごとメモリ (KB)

| Hour | TOTAL KB |
|------|----------|
| 0 | 835317 |
| 1 | 788916 |
| 2 | 831531 |
| 3 | 847755 |
| 4 | 805605 |
| 5 | 843671 |
| 6 | 856425 |
| 7 | 796008 |
| 8 | 857004 |
| 9 | 847882 |
| 10 | 835639 |
| 11 | 856599 |
| 12 | 849273 |
| final | 859206 |

### CPU使用率サンプル

| Hour | CPU % |
|------|-------|
| 0 | 6.8 |
| 1 | 37.8 |
| 2 | 24.1 |
| 3 | 54.8 |
| 4 | 39.2 |
| 5 | 25.8 |
| 6 | 16.6 |
| 7 | 85.2 |
| 8 | 15.6 |
| 9 | 19.3 |
| 10 | 50 |
| 11 | 25.8 |
| 12 | 21.8 |

### AsyncStorageサイズ (KB)

| Hour | RKStorage | App data total |
|------|-----------|----------------|
| 0 | 1372 | 23667 |
| 1 | 1368 | 23771 |
| 2 | 1372 | 23723 |
| 3 | 1372 | 23755 |
| 4 | 1372 | 23695 |
| 5 | 1372 | 23767 |
| 6 | 1372 | 23703 |
| 7 | 1368 | 23747 |
| 8 | 1372 | 23723 |
| 9 | 1372 | 23763 |
| 10 | 1372 | 23687 |
| 11 | 1372 | 23743 |
| 12 | 1372 | 23767 |

### 実行回数

- 株価更新 (15分毎): 44 回 (失敗 0)
- AI分析 (1時間毎): 13 回 (失敗 2)
- プロセス消失: 0

### エビデンス

- `docs/review/phase12-5-long-run/telemetry.jsonl`
- `docs/review/phase12-5-long-run/checkpoint.json`
- live logcat: `docs/review/twelve-hour-test/adb-logcat-live.log`（追記専用）
- snapshot: `docs/review/twelve-hour-test/adb-logcat-final-20260709-091018.log`
- snapshot: `docs/review/phase12-5-long-run/logcat-snapshot-20260709-091018.txt`
- `docs/review/twelve-hour-test/adb-logcat-final-*.log`（終了時コピー）
- `docs/review/phase12-5-long-run/meminfo-hour-*.txt`
- `docs/review/phase12-5-long-run/ui-dump-*.xml`（timestamp 付き · 固定 `dismiss.xml` は不使用）

### 再実行

```powershell
npm run verify:phase12-5
# または
PHASE12_5_HOURS=12 node scripts/phase12-5-long-run.mjs
```


### Live logcat tail
- file: `C:\Users\k416m\Documents\Projects\stock-trading-assistant\docs\review\twelve-hour-test\adb-logcat-live.log`
- tail lines: 150
- error excerpt lines: 0

**Error excerpt (last matches):**
\`\`\`
(none in tail)
\`\`\`

**Tail (last lines):**
\`\`\`
06-15 16:50:47.681  1767  1868 I MiuiSplitInputMethodImpl: Skip onPointerDownOutsideFocusLocked
06-15 16:50:47.681  1767  2053 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 272296590, channel '83ad685 com.assistant.stocktrading/com.assistant.stocktrading.MainActivity'
06-15 16:50:47.681  1767  1868 I MiuiSplitInputMethodImpl: Skip onPointerDownOutsideFocusLocked
06-15 16:50:47.682  1767  2053 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 272296590, channel '[Gesture Monitor] WMShell'
06-15 16:50:47.682  1767  1868 I MiuiSplitInputMethodImpl: Skip onPointerDownOutsideFocusLocked
06-15 16:50:47.682  1767  2053 I MIUIInput: [MotionEvent] publisher action=0x1, deviceId=5, 272296590, channel '[Gesture Monitor] miui-gesture'
06-15 16:50:47.682  1006  1096 I libPowerHal: [perfLockRel] hdl:77278, idx:2
06-15 16:50:47.682  1006  1096 I libPowerHal: [PD] MTKPOWER_HINT_APP_TOUCH update cmd:3408b00 param:0
06-15 16:50:47.683 20263 20263 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.assistant.stocktrading/com.assistant.stocktrading.MainActivity', { action=ACTION_DOWN, id[0]=0, pointerCount=1, eventTime=272296587, downTime=272296587, phoneEventTime=1781513447677 } moveCount:0
06-15 16:50:47.689 20263 20263 D VRI[MainActivity]: getMiuiFreeformStackInfo mTmpFrames.miuiFreeFormStackInfo: null
06-15 16:50:47.699 20263 20263 I MIUIInput: [MotionEvent] ViewRootImpl windowName 'com.assistant.stocktrading/com.assistant.stocktrading.MainActivity', { action=ACTION_UP, id[0]=0, pointerCount=1, eventTime=272296590, downTime=272296587, phoneEventTime=1781513447680 } moveCount:0
06-15 16:50:47.844   977  1626 I android.hardware.graphics.composer@3.1-service: FrameNotifyProcess Sensor: notify citsensorservice to trigger cwb
06-15 16:50:47.844  1510  1510 I libcitsensorservice@2.0-impl: msg_transfer
06-15 16:50:47.844  1510  1510 I libcitsensorservice@2.0-impl: msg_transfer msg.u.message_body[1] = -9
06-15 16:50:47.844  1510  1510 E libcitsensorservice@2.0-impl: log in cal_rgb_dump
06-15 16:50:47.844  1510  2070 I libsensor-frameBufferManager: request dump start
06-15 16:50:47.845   977  1652 I hwcomposer: [HWC] getDispDump(), dpy 1, (795,3,955,123), (160, 120), (1, 2), (-1), (-1), (0xb4000071bf8f2290)  
06-15 16:50:47.845   977  1652 I hwcomposer: [DRMDEV] isSupportWbParams(), id_crtc 60, id_connector 32, dump_point 1, src(160, 120), dst(160, 120), config 1  
06-15 16:50:47.845   977  1652 E hwcomposer: [DRMDEV] isSupportWbParams(), disp(1220, 2712)  
06-15 16:50:47.845   977  1652 I hwcomposer: [DISP_DUMP] setDumpBuf(), dpy(0), src(795, 3, 955, 123), dst(160, 120), (1, 2), -1, (-1), (0xb4000071bf8f2290)  
06-15 16:50:47.845   977  1652 I hwcomposer: [HWC] (0)fire a callback of refresh to SF[10]  
06-15 16:50:47.852  1121  1121 E HwcComposer: presentOrValidateDisplay 0 presentFence:-1
06-15 16:50:47.872  1510  2078 I libsensor-displayalgo: the value of valueOfHsv: -1.000000
06-15 16:50:47.872  1510  2078 I libsensor-displayalgo: the value of channelCali C:1606.891354,R:800.744840,G:618.393933,B:229.748766,scales C:1.164939,R:1.160473,G:1.211528,B:1.255602
06-15 16:50:47.872  1510  2078 I libsensor-displayalgo: the value of  REAL LUX109.009422
06-15 16:50:47.872  1510  2078 D libsensor-displayalgo: brightness:2047.000000,flat_mode:1.000000,R1:600.559714,G1:812.474880,B1:1383.897026,R2:15227.334502,G2:14753.541008,B2:14158.278859,R3:2882.777767,G3:2992.417179,B3:3390.394460,R4:5084.788509,G4:5084.782514,B4:5293.713165,EVENT C:3716.000000,R:1823.000000,G:1632.000000,B:815.000000, lux: 109.009422
06-15 16:50:47.875  1510  2073 D libsensor-parseRGB: the value of RGB [18.322304 21.020395 26.777772]
06-15 16:50:47.997  1060  8620 D NxpTml  : PN54X - I2C Read successful.....
06-15 16:50:47.998  1060  8620 I NxpNciR : len =  13 > 6F360A190300D301000000000C
06-15 16:50:47.998  1060  8620 D NxpTml  : PN54X - Posting read message.....
06-15 16:50:47.998  1060  8623 D NxpHal  : read successful status = 0x0
06-15 16:50:47.998  4763  5429 V libnfc_nci: processRspNtf: dataLen=13
06-15 16:50:47.998  4763  5429 D NxpGenExtn: vendor_nfc_handle_event Enter eventCode:12
06-15 16:50:47.998  4763  5429 D NxpGenExtn: handleVendorNciRspNtf Enter dataLen:13
06-15 16:50:47.998  4763  5429 D NxpGenExtn: phNxpExtn_HandleVendorNciRspNtf prop status:81
06-15 16:50:47.998  4763  5429 D NxpGenExtn: NfcExtensionController::handleVendorNciRspNtf Enter dataLen:13
06-15 16:50:47.998  4763  5429 D NxpGenExtn: DefaultEventHandler::handleVendorNciRspNtf Enter dataLen:13
06-15 16:50:47.999  4763  5429 D NxpGenExtn: phNxpExtn_HandleVendorNciRspNtf gen status:81
06-15 16:50:47.999  4763  5429 V libnfc_nci: processRspNtf: Exit status(81)
06-15 16:50:47.999  4763  5429 V libnfc_nci: GKI_getbuf: 0xb40000787e3b7580 51:54
06-15 16:50:47.999  4763  8610 V libnfc_nci: nfc_ncif_process_event: NFC received ntf gid=15
06-15 16:50:47.999  1060  8620 D NxpTml  : PN54X - Read requested.....
06-15 16:50:47.999  1060  8620 D NxpTml  : PN54X - Invoking I2C Read.....
06-15 16:50:48.000  4763  8610 D libnfc_nci: nfaVSCNtfCallback: event = 0xB6
06-15 16:50:48.000  4763  4763 I NfcService: sendVendorNciNotification
06-15 16:50:48.000  4763  8610 D libnfc_nci: nfaVSCNtfCallback: Exit
06-15 16:50:48.000  4763  7222 D ComNxpNfc: NxpNciPacketHandler:onVendorNciNotification Gid 111 Oid 54, payload: 190300d301000000000c
06-15 16:50:48.000  4763 11771 D ComNxpNfc: NxpNciPacketHandler:HandlerCallbackTask: doInBackground
06-15 16:50:48.001  4763 11771 D ComNxpNfc: LxDebugEventHandler:onVendorNciNotification GID: 111 OID: 54
06-15 16:50:48.001  4763 11771 D ComNxpNfc: LxDebugEventHandler:NCI_OID_SYSTEM_DEBUG_STATE_L2_MESSAGE: 
06-15 16:50:48.001  4763 11771 D ComNxpNfc: LxDebugEventHandler:Sending Lx Debug Callback to Application
06-15 16:50:48.001  4763 11771 D LXDebug : Received Data: 190300D301000000000C
06-15 16:50:48.001  4763 11771 D ComNxpNfc: LxDebugEventHandler:BroadCasting com.android.nfc.action.LX_DATA
06-15 16:50:48.052   977  1626 I android.hardware.graphics.composer@3.1-service: FrameNotifyProcess Sensor: notify citsensorservice to trigger cwb
06-15 16:50:48.052  1510  1510 I libcitsensorservice@2.0-impl: msg_transfer
06-15 16:50:48.052  1510  1510 I libcitsensorservice@2.0-impl: msg_transfer msg.u.message_body[1] = -9
06-15 16:50:48.052  1510  1510 E libcitsensorservice@2.0-impl: log in cal_rgb_dump
06-15 16:50:48.053  1510  2070 I libsensor-frameBufferManager: request dump start
06-15 16:50:48.053  1006  1096 I mtkpower@impl: [powerd_req] TIMER_MSG_PERF_LOCK_TIMEOUT hdl:77276
06-15 16:50:48.053  1006  1096 I libPowerHal: [perfLockRel] hdl:77276, idx:0
06-15 16:50:48.053  1006  1096 I libPowerHal: [setClusterFreq]  set cpu_ctrl cpufreq: -1 -1 -1 -1 
06-15 16:50:48.053  1006  1096 I libPowerHal: [unsetGPUFreq] current min:0, max:0; scn_gpu_min:0, scn_gpu_max:-1; scn_gpu_min(HL):-1, scn_gpu_max(HL):-1
06-15 16:50:48.053  1006  1096 I libPowerHal: system_server: set gpu opp level: 36
06-15 16:50:48.053   977  1652 I hwcomposer: [HWC] getDispDump(), dpy 1, (795,3,955,123), (160, 120), (1, 2), (-1), (-1), (0xb4000071bf8f2290)  
06-15 16:50:48.053  1006  1096 I libPowerHal: system_server: set gpu opp level max: 0
06-15 16:50:48.054   977  1652 I hwcomposer: [DRMDEV] isSupportWbParams(), id_crtc 60, id_connector 32, dump_point 1, src(160, 120), dst(160, 120), config 1  
06-15 16:50:48.054  1006  1096 I libPowerHal: [setGPUFreq] Soft min/max = (36, 0); Hard min/max = (36, 0)
06-15 16:50:48.054  1006  1096 I libPowerHal: [setGPUFreq] final min/max = (36, 0)
06-15 16:50:48.054   977  1652 E hwcomposer: [DRMDEV] isSupportWbParams(), disp(1220, 2712)  
06-15 16:50:48.054  1006  1096 I libPowerHal: system_server: set gpu opp level: 36
06-15 16:50:48.054  1006  1096 I libPowerHal: system_server: set gpu opp level max: 0
06-15 16:50:48.054   977  1652 I hwcomposer: [DISP_DUMP] setDumpBuf(), dpy(0), src(795, 3, 955, 123), dst(160, 120), (1, 2), -1, (-1), (0xb4000071bf8f2290)  
06-15 16:50:48.054  1006  1096 I libPowerHal: [PD] system_server update cmd:1000000 param:-1
06-15 16:50:48.055   977  1652 I hwcomposer: [HWC] (0)fire a callback of refresh to SF[10]  
06-15 16:50:48.064  1121  1121 E HwcComposer: presentOrValidateDisplay 0 presentFence:-1
06-15 16:50:48.074  1510  2078 I libsensor-displayalgo: the value of valueOfHsv: -1.000000
06-15 16:50:48.074  1510  2078 I libsensor-displayalgo: the value of channelCali C:1606.891354,R:800.744840,G:618.393933,B:229.748766,scales C:1.164939,R:1.160473,G:1.211528,B:1.255602
06-15 16:50:48.074  1510  2078 I libsensor-displayalgo: the value of  REAL LUX98.661392
06-15 16:50:48.074  1510  2078 D libsensor-displayalgo: brightness:2047.000000,flat_mode:1.000000,R1:600.559714,G1:812.474880,B1:1383.897026,R2:15227.334502,G2:14753.541008,B2:14158.278859,R3:2882.777767,G3:2992.417179,B3:3390.394460,R4:5084.788509,G4:5084.782514,B4:5293.713165,EVENT C:3531.000000,R:1740.000000,G:1554.000000,B:777.000000, lux: 98.661392
06-15 16:50:48.084  1510  2073 D libsensor-parseRGB: the value of RGB [18.322304 21.020395 26.777772]
\`\`\`

- memory_watch: `C:\Users\k416m\Documents\Projects\stock-trading-assistant\logs\memory_watch_20260708-205435.jsonl`
- health_restarts: 0