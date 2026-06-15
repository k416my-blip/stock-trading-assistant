package expo.modules.stanativeruntime

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import androidx.core.app.NotificationCompat

class LongRunForegroundService : Service() {
  companion object {
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
      }
      manager.createNotificationChannel(channel)
    }
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onCreate() {
    super.onCreate()
    ensureChannel(this)
  }

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
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

    startForeground(NOTIFICATION_ID, notification)
    running = true
    return START_STICKY
  }

  override fun onDestroy() {
    running = false
    stopForeground(STOP_FOREGROUND_REMOVE)
    super.onDestroy()
  }
}
