package expo.modules.stanativeruntime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat

class LongRunForegroundService : Service() {
  companion object {
    private const val TAG = "STA-SURVIVAL"
    const val CHANNEL_ID = "long_run_survival"
    const val NOTIFICATION_ID = 9001
    const val ACTION_STOP = "expo.modules.stanativeruntime.STOP_LONG_RUN"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"

    @Volatile
    var running: Boolean = false
      private set

    fun ensureChannel(context: Context) {
      if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
      val manager = context.getSystemService(NotificationManager::class.java) ?: return
      if (manager.getNotificationChannel(CHANNEL_ID) != null) return
      val channel = NotificationChannel(
        CHANNEL_ID,
        "Long Run Survival",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        description = "Keeps 12h monitor alive while screen is off"
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }
      manager.createNotificationChannel(channel)
    }

    fun isRunningInProcess(context: Context): Boolean {
      if (running) return true
      val manager = context.getSystemService(Context.ACTIVITY_SERVICE) as android.app.ActivityManager
      @Suppress("DEPRECATION")
      val services = manager.getRunningServices(200) ?: return false
      val target = LongRunForegroundService::class.java.name
      return services.any { it.service.className == target && it.foreground }
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel(this)
    Log.i(TAG, "onCreate")
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      Log.i(TAG, "onStartCommand STOP")
      stopSelf()
      return START_NOT_STICKY
    }

    val title = intent?.getStringExtra(EXTRA_TITLE) ?: "12時間監視"
    val body = intent?.getStringExtra(EXTRA_BODY) ?: "バックグラウンド稼働中"

    val launchIntent = packageManager.getLaunchIntentForPackage(packageName)
    val pendingIntent = PendingIntent.getActivity(
      this,
      0,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

    val notification: Notification = NotificationCompat.Builder(this, CHANNEL_ID)
      .setContentTitle(title)
      .setContentText(body)
      .setSmallIcon(applicationInfo.icon)
      .setOngoing(true)
      .setPriority(NotificationCompat.PRIORITY_LOW)
      .setCategory(NotificationCompat.CATEGORY_SERVICE)
      .setContentIntent(pendingIntent)
      .build()

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
        startForeground(
          NOTIFICATION_ID,
          notification,
          ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC,
        )
      } else {
        startForeground(NOTIFICATION_ID, notification)
      }
      running = true
      Log.i(TAG, "startForeground OK notificationId=$NOTIFICATION_ID")
    } catch (e: Exception) {
      running = false
      Log.e(TAG, "startForeground FAILED", e)
      stopSelf()
      return START_NOT_STICKY
    }

    return START_STICKY
  }

  override fun onTaskRemoved(rootIntent: Intent?) {
    Log.w(TAG, "onTaskRemoved — restarting FGS")
    val restart = Intent(applicationContext, LongRunForegroundService::class.java).apply {
      putExtra(EXTRA_TITLE, "12時間監視")
      putExtra(EXTRA_BODY, "バックグラウンド稼働中")
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      applicationContext.startForegroundService(restart)
    } else {
      applicationContext.startService(restart)
    }
    super.onTaskRemoved(rootIntent)
  }

  override fun onDestroy() {
    running = false
    Log.w(TAG, "onDestroy")
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
