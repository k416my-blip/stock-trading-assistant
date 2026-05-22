package expo.modules.stanativeruntime

import android.app.ActivityManager
import android.content.ComponentCallbacks2
import android.content.Context
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Build
import android.os.PowerManager
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicInteger

class StaNativeRuntimeModule : Module() {
  private val trimBurst = AtomicInteger(0)
  private var lastTrimAt = 0L
  private var callbacksRegistered = false

  override fun definition() = ModuleDefinition {
    Name("StaNativeRuntime")

    Events("onTrimMemory")

    OnCreate {
      registerTrimCallbacks()
    }

    AsyncFunction("getSnapshot") {
      buildSnapshot()
    }

    AsyncFunction("getMemoryClass") {
      buildMemoryClass()
    }
  }

  private fun registerTrimCallbacks() {
    if (callbacksRegistered) return
    val ctx = appContext.reactContext?.applicationContext ?: return
    callbacksRegistered = true
    ctx.registerComponentCallbacks(object : ComponentCallbacks2 {
      override fun onTrimMemory(level: Int) {
        val now = System.currentTimeMillis()
        if (now - lastTrimAt < 3000) {
          trimBurst.incrementAndGet()
        } else {
          trimBurst.set(1)
        }
        lastTrimAt = now
        sendEvent("onTrimMemory", mapOf("level" to level))
      }

      override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {}
      override fun onLowMemory() {
        sendEvent("onTrimMemory", mapOf("level" to ComponentCallbacks2.TRIM_MEMORY_COMPLETE))
      }
    })
  }

  private fun buildMemoryClass(): Map<String, Any> {
    val ctx = appContext.reactContext?.applicationContext
      ?: return defaultMemoryClass()
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val lowRam = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      am.isLowRamDevice
    } else {
      false
    }
    return mapOf(
      "memoryClassMb" to am.memoryClass,
      "largeMemoryClassMb" to am.largeMemoryClass,
      "lowRamDevice" to lowRam,
      "isLowRamDevice" to lowRam,
    )
  }

  private fun defaultMemoryClass(): Map<String, Any> = mapOf(
    "memoryClassMb" to 192,
    "largeMemoryClassMb" to 512,
    "lowRamDevice" to false,
    "isLowRamDevice" to false,
  )

  private fun buildSnapshot(): Map<String, Any?> {
    val ctx = appContext.reactContext?.applicationContext ?: return emptyMap()
    val am = ctx.getSystemService(Context.ACTIVITY_SERVICE) as ActivityManager
    val mi = ActivityManager.MemoryInfo()
    am.getMemoryInfo(mi)

    val pressure = if (mi.totalMem > 0) {
      ((1.0 - mi.availMem.toDouble() / mi.totalMem) * 100).toInt().coerceIn(0, 100)
    } else {
      0
    }

    val pm = ctx.getSystemService(Context.POWER_SERVICE) as PowerManager
    val batterySaver = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      pm.isPowerSaveMode
    } else {
      false
    }

    val thermal = thermalLabel(pm)
    val trimCode = trimLevelFromBurst(mi.lowMemory)
    val network = networkQuality(ctx)
    val memClass = buildMemoryClass()
    val manufacturer = Build.MANUFACTURER ?: "unknown"
    val brand = Build.BRAND ?: "unknown"
    val model = Build.MODEL ?: "unknown"
    val xiaomi = isXiaomiFamily(manufacturer, brand)
    val foreground = !mi.lowMemory && trimCode < ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN
    val miuiReclaim = xiaomi && (trimBurst.get() >= 3 || mi.lowMemory)

    val anrRisk = (pressure / 4 + trimBurst.get() * 5).coerceIn(0, 100)

    return mapOf(
      "bridgeVersion" to 1,
      "nativeMemoryPressurePct" to pressure,
      "trimLevelCode" to trimCode,
      "trimMemoryBurstCount" to trimBurst.get(),
      "thermalStatus" to thermal,
      "batterySaverActive" to batterySaver,
      "lowPowerMode" to batterySaver,
      "foreground" to foreground,
      "backgroundReclaimDetected" to (trimBurst.get() >= 2 || mi.lowMemory),
      "droppedFramesEstimate" to 0,
      "anrRiskScore" to anrRisk,
      "networkTransportQuality" to network,
      "memoryClassMb" to memClass["memoryClassMb"]!!,
      "largeMemoryClassMb" to memClass["largeMemoryClassMb"]!!,
      "lowRamDevice" to memClass["lowRamDevice"]!!,
      "isLowRamDevice" to memClass["isLowRamDevice"]!!,
      "manufacturer" to manufacturer,
      "brand" to brand,
      "model" to model,
      "isXiaomiFamily" to xiaomi,
      "miuiAggressiveReclaim" to miuiReclaim,
    )
  }

  private fun trimLevelFromBurst(lowMemory: Boolean): Int {
    val burst = trimBurst.get()
    if (lowMemory) return ComponentCallbacks2.TRIM_MEMORY_COMPLETE
    return when {
      burst >= 4 -> ComponentCallbacks2.TRIM_MEMORY_BACKGROUND
      burst >= 2 -> ComponentCallbacks2.TRIM_MEMORY_UI_HIDDEN
      burst >= 1 -> ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW
      else -> 0
    }
  }

  private fun thermalLabel(pm: PowerManager): String {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      return when (pm.currentThermalStatus) {
        PowerManager.THERMAL_STATUS_SHUTDOWN -> "shutdown"
        PowerManager.THERMAL_STATUS_EMERGENCY -> "emergency"
        PowerManager.THERMAL_STATUS_CRITICAL -> "critical"
        PowerManager.THERMAL_STATUS_SEVERE -> "severe"
        PowerManager.THERMAL_STATUS_MODERATE -> "moderate"
        PowerManager.THERMAL_STATUS_LIGHT -> "light"
        else -> "none"
      }
    }
    return "none"
  }

  private fun networkQuality(ctx: Context): String {
    val cm = ctx.getSystemService(Context.CONNECTIVITY_SERVICE) as? ConnectivityManager
      ?: return "unknown"
    val network = cm.activeNetwork ?: return "offline"
    val caps = cm.getNetworkCapabilities(network) ?: return "unknown"
    return when {
      caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_NOT_METERED) &&
        caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "excellent"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI) -> "good"
      caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR) -> "fair"
      !caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET) -> "offline"
      else -> "good"
    }
  }

  private fun isXiaomiFamily(manufacturer: String, brand: String): Boolean {
    val m = "$manufacturer $brand".lowercase()
    return m.contains("xiaomi") || m.contains("redmi") || m.contains("poco")
  }
}
