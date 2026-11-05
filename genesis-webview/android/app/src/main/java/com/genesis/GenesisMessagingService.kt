package com.genesis

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.os.Build
import android.provider.Settings
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.messaging.FirebaseMessagingService
import com.google.firebase.messaging.RemoteMessage

class GenesisMessagingService : FirebaseMessagingService() {

    override fun onMessageReceived(remoteMessage: RemoteMessage) {
        val data = remoteMessage.data
        val notification = remoteMessage.notification
        val title = data["title"] ?: notification?.title
        val body = data["body"] ?: notification?.body

        if (title.isNullOrBlank() && body.isNullOrBlank()) return

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(
                this,
                Manifest.permission.POST_NOTIFICATIONS,
            ) != PackageManager.PERMISSION_GRANTED
        ) {
            return
        }

        val category = data["category"].orEmpty().ifBlank { "general" }
        val link = data["link"].orEmpty().ifBlank { "/notifications" }
        val entityId = data["entityId"]
        val unreadCount = data["unreadCount"]?.toIntOrNull() ?: 0
        val messageId = remoteMessage.messageId ?: System.currentTimeMillis().toString()
        val tag = if (!entityId.isNullOrBlank()) {
            "g:$category:$entityId"
        } else {
            "$category:$messageId"
        }

        ensureChannel(category)
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return

        val child = baseBuilder(category)
            .setContentTitle(title?.takeIf { it.isNotBlank() } ?: getString(R.string.app_name))
            .setContentText(body.orEmpty())
            .setAutoCancel(true)
            .setContentIntent(contentIntent(link, tag))
            .apply {
                if (!body.isNullOrBlank()) {
                    setStyle(
                        NotificationCompat.BigTextStyle()
                            .bigText(body)
                            .setBigContentTitle(title ?: getString(R.string.app_name)),
                    )
                }
            }
            .build()

        manager.notify(tag, tag.hashCode(), child)

        if (unreadCount > 0) {
            val summary = baseBuilder("general")
                .setContentTitle(getString(R.string.app_name))
                .setContentText("$unreadCount new notifications")
                .setNumber(unreadCount)
                .setGroupSummary(true)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setSilent(true)
                .setAutoCancel(true)
                .setContentIntent(contentIntent("/notifications", SUMMARY_TAG))
                .build()
            manager.notify(SUMMARY_TAG, SUMMARY_ID, summary)
        }
    }

    override fun onNewToken(token: String) {
        super.onNewToken(token)
        getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_TOKEN, token)
            .apply()
        GenesisPushState.deliverToken(token)
    }

    private fun baseBuilder(channelId: String): NotificationCompat.Builder =
        NotificationCompat.Builder(this, channelId)
            .setSmallIcon(R.drawable.ic_stat_genesis)
            .setColor(ContextCompat.getColor(this, R.color.notification_icon_color))
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setDefaults(
                NotificationCompat.DEFAULT_SOUND or
                    NotificationCompat.DEFAULT_VIBRATE or
                    NotificationCompat.DEFAULT_LIGHTS,
            )
            .setGroup(GROUP)
            .setGroupSummary(false)
            .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_ALL)
            .setWhen(System.currentTimeMillis())
            .setShowWhen(true)

    private fun contentIntent(link: String, requestKey: String): PendingIntent {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_SINGLE_TOP or
                Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(EXTRA_LINK, link)
        }
        return PendingIntent.getActivity(
            this,
            requestKey.hashCode(),
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
    }

    private fun ensureChannel(category: String) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        val manager = getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
        if (manager.getNotificationChannel(category) != null) return
        createChannel(manager, category)
    }

    companion object {
        const val EXTRA_LINK = "genesis_link"

        private const val GROUP = "genesis"
        private const val SUMMARY_TAG = "genesis_summary"
        private const val SUMMARY_ID = Int.MAX_VALUE - 1
        private const val PREFS = "genesis_push"
        private const val KEY_TOKEN = "token"

        private val CATEGORIES = arrayOf(
            "assignments", "homework", "attendance", "exams", "results", "quizzes",
            "submissions", "evaluations", "announcements", "messages", "notice",
            "timetable", "mindmaps", "ocr", "adaptive", "ai", "skill", "parent",
            "teacher", "admin", "fee", "performance", "certificates", "login",
            "security", "reports", "system", "general",
        )

        /** Create every per-category channel once, so system-fallback pushes work
         *  even when the app process was killed before the first message. */
        fun ensureChannels(context: Context) {
            if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
            val manager = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            CATEGORIES.forEach { category ->
                if (manager.getNotificationChannel(category) == null) {
                    createChannel(manager, category)
                }
            }
        }

        private fun createChannel(manager: NotificationManager, category: String) {
            val channel = NotificationChannel(
                category,
                prettyName(category),
                NotificationManager.IMPORTANCE_HIGH,
            ).apply {
                description = "Genesis ${prettyName(category)}"
                enableVibration(true)
                setSound(
                    Settings.System.DEFAULT_NOTIFICATION_URI,
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build(),
                )
                setShowBadge(true)
            }
            manager.createNotificationChannel(channel)
        }

        private fun prettyName(category: String): String =
            category.split('_')
                .filter { it.isNotEmpty() }
                .joinToString(" ") { part ->
                    part.replaceFirstChar { it.uppercase() }
                }
    }
}
