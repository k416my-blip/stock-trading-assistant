package expo.modules.stanativeruntime

import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.content.Intent
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.BatteryManager
import android.os.Build
import android.os.PowerManager
import android.util.Log
import androidx.core.os.bundleOf
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.BufferedReader
import java.io.FileReader

class StaNativeRuntimeModule : Module() {
  private var wakeLock: PowerManager.WakeLock? = null
  private var trimBurstCount = 0
  private var lastTrimAt = 0L

  companion object {
    private const val TAG = "STA-SURVIVAL"
  }

  override fun definition() = ModuleDefinition {
    Name("StaNativeRuntime")

    Events("onTrimMemory", "onNativeLifecycle")

    OnCreate {
      val ctx = appContext.reactContext ?: return@OnCreate
      ctx.registerComponentCallbacks(trimCallbacks)
    }

    OnDestroy {
      val ctx = appContext.reactContext
      ctx?.unregisterComponentCallbacks(trimCallbacks)
      releaseWakeLockInternal()
    }

    AsyncFunction("getSnapshot") {
      buildSnapshotMap()
    }

    AsyncFunction("getMemoryClass") {
      val am = activityManager()
      mapOf(
        "memoryClassMb" to am.memoryClass,
        "largeMemoryClassMb" to am.largeMemoryClass,
        "lowRamDevice" to am.isLowRamDevice,
        "isLowRamDevice" to am.isLowRamDevice,
      )
    }

    AsyncFunction("acquirePartialWakeLock") { tag: String ->
      acquireWakeLockInternal(tag)
    }

    AsyncFunction("releasePartialWakeLock") {
      releaseWakeLockInternal()
    }

    AsyncFunction("startLongRunForegroundService") { title: String?, body: String? ->
      startForegroundServiceInternal(title, body)
    }

    AsyncFunction("stopLongRunForegroundService") {
      stopForegroundServiceInternal()
    }

    AsyncFunction("getSurvivalStatus") {
      val ctx = appContext.reactContext ?: return@AsyncFunction mapOf(
        "wakeLockHeld" to false,
        "foregroundServiceRunning" to false,
      )
      mapOf(
        "wakeLockHeld" to (wakeLock?.isHeld == true),
        "foregroundServiceRunning" to LongRunForegroundService.isRunningInProcess(ctx),
      )
    }
  }

  private val trimCallbacks = object : ComponentCallbacks2 {
    override fun onTrimMemory(level: Int) {
      val now = System.currentTimeMillis()
      if (now - lastTrimAt < 3000) {
        trimBurstCount += 1
      } else {
        trimBurstCount = 1
      }
      lastTrimAt = now

      sendEvent("onTrimMemory", bundleOf("level" to level))
      sendEvent(
        "onNativeLifecycle",
        bundleOf(
          "kind" to "trim_memory",
          "level" to level,
          "phase" to trimPhaseLabel(level),
          "reconnectOwner" to "none",
        ),
      )
    }

    override fun onConfigurationChanged(newConfig: android.content.res.Configuration) = Unit

    override fun onLowMemory() {
      sendEvent(
        "onNativeLifecycle",
        bundleOf(
          "kind" to "low_memory",
          "level" to 80,
          "phase" to "complete",
          "reconnectOwner" to "none",
        ),
      )
    }
  }

  private fun activityManager(): ActivityManager {
    val ctx = requireContext()
    return ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
  }

  private fun requireContext(): Context {
    return requireNotNull(appContext.reactContext)
  }

  private fun appContextSafe(): Context {
    return appContext.reactContext?.applicationContext
      ?: requireContext().applicationContext
  }

  private fun buildSnapshotMap(): Map<String, Any?> {
    val ctx = requireContext()
    val am = activityManager()
    val memInfo = ActivityManager.MemoryInfo()
    am.getMemoryInfo(memInfo)

    val manufacturer = Build.MANUFACTURER ?: "unknown"
    val brand = Build.BRAND ?: "unknown"
    val model = Build.MODEL ?: "unknown"
    val isXiaomi = isXiaomiFamily(manufacturer, brand)

    val totalMb = memInfo.totalMem / (1024 * 1024)
    val availMb = memInfo.availMem / (1024 * 1024)
    val pressurePct = if (totalMb > 0) {
      ((totalMb - availMb).toDouble() / totalMb.toDouble() * 100.0).toInt().coerceIn(0, 100)
    } else {
      0
    }

    val javaHeapUsedMb = ((Runtime.getRuntime().totalMemory() - Runtime.getRuntime().freeMemory()) / (1024 * 1024)).toInt()
    val nativeHeapMb = readNativeHeapMb()

    val batterySaver = isBatterySaverActive(ctx)
    val foreground = isAppForeground(ctx)
    val networkQuality = mapNetworkQuality(ctx)
    val thermal = mapThermalStatus(ctx)

    return mapOf(
      "bridgeVersion" to 1,
      "manufacturer" to manufacturer,
      "brand" to brand,
      "model" to model,
      "isXiaomiFamily" to isXiaomi,
      "memoryClassMb" to am.memoryClass,
      "largeMemoryClassMb" to am.largeMemoryClass,
      "lowRamDevice" to am.isLowRamDevice,
      "isLowRamDevice" to am.isLowRamDevice,
      "nativeMemoryPressurePct" to pressurePct,
      "trimLevelCode" to 0,
      "trimMemoryBurstCount" to trimBurstCount,
      "thermalStatus" to thermal,
      "batterySaverActive" to batterySaver,
      "lowPowerMode" to batterySaver,
      "foreground" to foreground,
      "backgroundReclaimDetected" to (trimBurstCount >= 2),
      "droppedFramesEstimate" to 0,
      "anrRiskScore" to 0,
      "networkTransportQuality" to networkQuality,
      "nativeHeapAllocatedMb" to nativeHeapMb,
      "javaHeapUsedMb" to javaHeapUsedMb,
      "availMemMb" to availMb,
      "totalMemMb" to totalMb,
      "batteryLevelPct" to readBatteryLevel(ctx),
      "bridgePendingEstimate" to 0,
      "miuiAggressiveReclaim" to (isXiaomi && trimBurstCount >= 3),
    )
  }

  private fun acquireWakeLockInternal(tag: String) {
    val ctx = appContextSafe()
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    releaseWakeLockInternal()
    wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "sta:$tag").apply {
      setReferenceCounted(false)
      acquire(12L * 3600L * 1000L)
    }
    Log.i(TAG, "wakeLock acquired tag=$tag held=${wakeLock?.isHeld == true}")
  }

  private fun releaseWakeLockInternal() {
    wakeLock?.let {
      if (it.isHeld) it.release()
    }
    wakeLock = null
    Log.i(TAG, "wakeLock released")
  }

  private fun startForegroundServiceInternal(title: String?, body: String?) {
    val ctx = appContextSafe()
    LongRunForegroundService.ensureChannel(ctx)
    val intent = Intent(ctx, LongRunForegroundService::class.java).apply {
      putExtra(LongRunForegroundService.EXTRA_TITLE, title ?: "12時間監視")
      putExtra(LongRunForegroundService.EXTRA_BODY, body ?: "バックグラウンド稼働中")
    }
    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        ctx.startForegroundService(intent)
      } else {
        ctx.startService(intent)
      }
      Log.i(TAG, "startForegroundService requested title=${title ?: "12時間監視"}")
    } catch (e: Exception) {
      Log.e(TAG, "startForegroundService FAILED", e)
      throw e
    }
  }

  private fun stopForegroundServiceInternal() {
    val ctx = appContextSafe()
    val intent = Intent(ctx, LongRunForegroundService::class.java).apply {
      action = LongRunForegroundService.ACTION_STOP
    }
    ctx.startService(intent)
    ctx.stopService(Intent(ctx, LongRunForegroundService::class.java))
    Log.i(TAG, "stopForegroundService")
  }

  private fun isXiaomiFamily(manufacturer: String, brand: String): Boolean {
    val m = "$manufacturer $brand".lowercase()
    return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco")
  }

  private fun isBatterySaverActive(ctx: Context): Boolean {
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    return pm.isPowerSaveMode
  }

  private fun isAppForeground(ctx: Context): Boolean {
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val procs = am.runningAppProcesses ?: return false
    val pkg = ctx.packageName
    for (proc in procs) {
      if (proc.processName == pkg) {
        return proc.importance <= ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND
      }
    }
    return false
  }

  private fun mapNetworkQuality(ctx: Context): String {
    val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
    val network = cm.activeNetwork ?: return "offline"
    val caps = cm.getNetworkCapabilities(network) ?: return "unknown"
    if (!caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)) return "offline"
    return when {
      caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "excellent"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "good"
      else -> "fair"
    }
  }

  private fun mapThermalStatus(ctx: Context): String {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return "none"
    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    return when (pm.currentThermalStatus) {
      PowerManager.THERMAL_STATUS_NONE, PowerManager.THERMAL_STATUS_LIGHT -> "light"
      PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
      PowerManager.THERMAL_STATUS_SEVERE -> "critical"
      PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
      PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency"
      PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown"
      else -> "none"
    }
  }

  private fun readBatteryLevel(ctx: Context): Int? {
    val bm = ctx.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
    val level = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    return if (level in 0..100) level else null
  }

  private fun readNativeHeapMb(): Int {
    return try {
      BufferedReader(FileReader("/proc/self/status")).use { reader ->
        var line: String?
        while (reader.readLine().also { line = it } != null) {
          if (line!!.startsWith("VmRSS:")) {
            val kb = line!!.substringAfter("VmRSS:").trim().removeSuffix(" kB").toIntOrNull() ?: return 0
            return kb / 1024
          }
        }
      }
      0
    } catch (_: Exception) {
      0
    }
  }

  private fun trimPhaseLabel(level: Int): String = when {
    level >= ComponentCallbacks2.TRIM_MEMORY_COMPLETE -> "complete"
    level >= ComponentCallbacks2.TRIM_MEMORY_BACKGROUND -> "background"
    level >= ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN -> "uiHidden"
    level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_CRITICAL -> "runningCritical"
    level >= ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW -> "runningLow"
    level > ComponentCallbacks2.TRIM_MEMORY_RUNNING_MODERATE -> "runningModerate"
    else -> "none"
  }
}
