package com.school.lms;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.drawable.Drawable;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.content.ContextCompat;
import com.capacitorjs.plugins.pushnotifications.PushNotificationsPlugin;
import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Genesis notification service.
 *
 * Replaces the Capacitor push-notifications default {@code MessagingService} as
 * the {@code com.google.firebase.MESSAGING_EVENT} receiver (see AndroidManifest).
 * The backend sends Android devices a data-only FCM message, which Android
 * delivers to this service in EVERY app state (foreground, background, killed,
 * locked, screen off), giving us full control over the notification experience.
 *
 * Rendering (WhatsApp/Gmail-style):
 *  - Every arrival posts a child notification with the full-color Genesis logo,
 *    its per-category channel, high priority, heads-up popup, lock-screen
 *    visibility and a deep-link tap action. It appears as its own card in the
 *    shade; an update for the same entity replaces that card instead of stacking
 *    a duplicate (tag = category:entityId).
 *  - A single app-wide summary card keeps the stack collapsed, exactly like
 *    "WhatsApp · 5 new messages": title "Genesis", body "N new notifications"
 *    and an expandable Inbox-style list of the most recent titles. The summary
 *    is silent (no double sound) and carries the launcher badge number.
 *  - The launcher badge is set from the backend-provided unread count so it
 *    updates even when the app is killed, and matches the badge set by the web
 *    app (capawesome badge plugin) while it is open.
 *
 * Other responsibilities:
 *  - Deep links: the tap intent carries google.message_id + the payload, which
 *    the Capacitor push plugin replays to the web app's existing deep-link
 *    handler (works from a cold start too).
 *  - Foreground: messages are forwarded to the push plugin so the existing
 *    in-app toast/list keep working; the native notification is still shown.
 *  - Token rotation is forwarded to the push plugin for re-registration.
 */
public class GenesisMessagingService extends FirebaseMessagingService {

    /** App-wide group key — summary + children render as one expandable stack. */
    private static final String GROUP = "genesis";
    private static final String SUMMARY_TAG = "genesis_summary";
    private static final int SUMMARY_ID = Integer.MAX_VALUE - 1;

    /** Persisted recent titles shown inside the expandable summary. */
    private static final String PREFS = "genesis_notifications";
    private static final String KEY_LINES = "lines";
    private static final int MAX_LINES = 8;

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();
        if (data == null || data.isEmpty()) {
            return; // FCM keep-alive or a message without a payload.
        }

        // When the app is open, the native heads-up notification below is the only
        // surface the user sees (the web app no longer shows an in-app toast on
        // Android). The push plugin forwarding is kept so any web-side listeners
        // (in-app list refresh) still fire, but on Android the toast is suppressed.
        if (PushNotificationsPlugin.getPushNotificationsInstance() != null) {
            PushNotificationsPlugin.sendRemoteMessage(remoteMessage);
        }

        // Notifications cannot be shown before the OS permission is granted
        // (Android 13+). The message was already forwarded to the web app above.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
                checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        String title = value(data, "title");
        String body = value(data, "body");
        String category = value(data, "category");
        String type = value(data, "type");
        String entityId = value(data, "entityId");
        String link = value(data, "link");
        int unreadCount = intValue(data.get("unreadCount"));

        if (title == null && body == null) {
            return;
        }
        if (category == null) {
            category = "general";
        }

        String messageId = remoteMessage.getMessageId() != null
                ? remoteMessage.getMessageId()
                : String.valueOf(System.currentTimeMillis());
        ensureChannel(category);
        String tag = entityId != null ? "g:" + category + ":" + entityId : category + ":" + messageId;

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) {
            return;
        }

        // 1) Child notification — its own card in the shade, per-entity dedupe.
        //    Always HIGH priority so it heads-up pops in every app state, exactly
        //    like WhatsApp/Gmail.
        NotificationCompat.Builder child = buildChild(title, body, category, type, link, data, messageId);
        manager.notify(tag, tag.hashCode(), child.build());

        // 2) Refresh the collapsed stack summary ("Genesis · N new notifications").
        List<Line> lines = storeLine(tag, title);
        int count = unreadCount > 0 ? unreadCount : lines.size();
        NotificationCompat.Builder summary = buildSummary(lines, count);
        manager.notify(SUMMARY_TAG, SUMMARY_ID, summary.build());
    }

    @Override
    public void onNewToken(@NonNull String token) {
        super.onNewToken(token);
        // Hand the rotated token to the push plugin, which forwards it to the web
        // app ('registration' event) so it can re-register with the backend.
        PushNotificationsPlugin.onNewToken(token);
    }

    // ── Notification building ─────────────────────────────

    private NotificationCompat.Builder buildChild(
            String title, String body, String category, String type, String link,
            Map<String, String> data, String messageId) {
        NotificationCompat.Builder b = baseBuilder(category)
                .setContentTitle(title != null ? title : getString(R.string.app_name))
                .setContentText(body != null ? body : "")
                .setAutoCancel(true)
                .setContentIntent(contentIntent(link, type, data, messageId));

        if (body != null && !body.isEmpty()) {
            b.setStyle(new NotificationCompat.BigTextStyle()
                    .bigText(body)
                    .setBigContentTitle(title != null ? title : getString(R.string.app_name)));
        }
        return b;
    }

    /**
     * The collapsed stack card: "Genesis · N new notifications", expandable into
     * an Inbox-style list of the most recent titles. Silent (the children already
     * sound) and never heads-up on its own; carries the launcher badge number.
     */
    private NotificationCompat.Builder buildSummary(List<Line> lines, int count) {
        NotificationCompat.InboxStyle style = new NotificationCompat.InboxStyle()
                .setBigContentTitle(getString(R.string.app_name));
        for (Line line : lines) {
            style.addLine(line.title != null ? line.title : getString(R.string.app_name));
        }
        style.setSummaryText(pluralize(count));

        return baseBuilder("general")
                .setContentTitle(getString(R.string.app_name))
                .setContentText(pluralize(count))
                .setStyle(style)
                .setNumber(count)
                .setGroupSummary(true)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_CHILDREN)
                .setSilent(true)
                .setAutoCancel(true)
                .setContentIntent(contentIntent("/notifications", null, null, SUMMARY_TAG));
    }

    /**
     * Shared base for every notification: Genesis logo, brand color, HIGH
     * priority, lock-screen visibility, sound/vibration via the channel, and
     * membership in the app-wide group. HIGH priority + the channel's HIGH
     * importance is what produces the native heads-up popup in every app state
     * (open, background, killed) exactly like WhatsApp / Gmail.
     */
    private NotificationCompat.Builder baseBuilder(String channelId) {
        return new NotificationCompat.Builder(this, channelId)
                .setSmallIcon(R.drawable.ic_stat_genesis)
                .setLargeIcon(largeIcon())
                .setColor(ContextCompat.getColor(this, R.color.notification_icon_color))
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                .setDefaults(NotificationCompat.DEFAULT_SOUND | NotificationCompat.DEFAULT_VIBRATE | NotificationCompat.DEFAULT_LIGHTS)
                .setGroup(GROUP)
                .setGroupSummary(false)
                .setGroupAlertBehavior(NotificationCompat.GROUP_ALERT_ALL)
                .setWhen(System.currentTimeMillis())
                .setShowWhen(true);
    }

    /**
     * Tap action: opens MainActivity with the message payload as extras. The
     * Capacitor push plugin reads {@code google.message_id} + the payload keys in
     * onNewIntent and fires pushNotificationActionPerformed, which the web app's
     * existing deep-link handler resolves (data.link or data.type). Works from a
     * cold start too (BridgeActivity replays the launch intent to plugins).
     */
    private PendingIntent contentIntent(String link, String type, Map<String, String> data, String requestKey) {
        Intent intent = new Intent(this, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("google.message_id", requestKey);
        if (link != null) intent.putExtra("link", link);
        if (type != null) intent.putExtra("type", type);
        if (data != null) {
            for (Map.Entry<String, String> e : data.entrySet()) {
                intent.putExtra(e.getKey(), e.getValue());
            }
        }
        return PendingIntent.getActivity(
                this,
                Math.abs(requestKey.hashCode()),
                intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    // ── Channel management ────────────────────────────────

    /**
     * Ensure the per-category channel exists before notifying. Channels are
     * normally created by the web app (ensureNotificationChannels) so this only
     * runs for the very first notification before the app has ever been opened.
     * An existing channel is never touched, preserving user sound/vibration
     * choices.
     */
    private void ensureChannel(String category) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(category) != null) return;
        NotificationChannel channel = new NotificationChannel(
                category,
                prettyName(category),
                NotificationManager.IMPORTANCE_HIGH);
        channel.setDescription(getString(R.string.app_name) + " " + prettyName(category));
        channel.enableVibration(true);
        channel.setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI,
                new android.media.AudioAttributes.Builder()
                        .setContentType(android.media.AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(android.media.AudioAttributes.USAGE_NOTIFICATION)
                        .build());
        channel.setShowBadge(true);
        manager.createNotificationChannel(channel);
    }

    private String prettyName(String category) {
        if (category == null || category.isEmpty()) return "General";
        String[] parts = category.split("_");
        StringBuilder sb = new StringBuilder();
        for (String p : parts) {
            if (p.isEmpty()) continue;
            if (sb.length() > 0) sb.append(' ');
            sb.append(Character.toUpperCase(p.charAt(0)));
            if (p.length() > 1) sb.append(p.substring(1));
        }
        return sb.toString();
    }

    // ── Recent-titles store (expandable summary) ──────────

    private List<Line> storeLine(String tag, String title) {
        SharedPreferences prefs = getSharedPreferences(PREFS, MODE_PRIVATE);
        List<Line> lines = readLines(prefs);
        // Replace an existing entry for the same entity (re-notification) instead
        // of stacking duplicates, then move it to the top.
        lines.removeIf(l -> l.tag.equals(tag));
        lines.add(0, new Line(tag, title));
        while (lines.size() > MAX_LINES) {
            lines.remove(lines.size() - 1);
        }
        prefs.edit().putString(KEY_LINES, toJson(lines)).apply();
        return lines;
    }

    private List<Line> readLines(SharedPreferences prefs) {
        List<Line> lines = new ArrayList<>();
        String raw = prefs.getString(KEY_LINES, "[]");
        try {
            JSONArray arr = new JSONArray(raw);
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                lines.add(new Line(o.optString("tag"), o.optString("title")));
            }
        } catch (JSONException ignored) {
            // Corrupt cache — treat as empty.
        }
        return lines;
    }

    private String toJson(List<Line> lines) {
        JSONArray arr = new JSONArray();
        for (Line l : lines) {
            JSONObject o = new JSONObject();
            try {
                o.put("tag", l.tag);
                o.put("title", l.title != null ? l.title : "");
            } catch (JSONException ignored) {
            }
            arr.put(o);
        }
        return arr.toString();
    }

    // ── Helpers ───────────────────────────────────────────

    private static String value(Map<String, String> data, String key) {
        String v = data.get(key);
        return (v == null || v.isEmpty()) ? null : v;
    }

    private static int intValue(String raw) {
        if (raw == null) return 0;
        try {
            return Integer.parseInt(raw);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    private String pluralize(int count) {
        return count == 1
                ? count + " new notification"
                : count + " new notifications";
    }

    private Bitmap largeIcon() {
        Drawable d = ContextCompat.getDrawable(this, R.drawable.ic_notification_large);
        if (d == null) return null;
        int size = Math.round(64 * getResources().getDisplayMetrics().density);
        Bitmap bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888);
        Canvas canvas = new Canvas(bmp);
        d.setBounds(0, 0, size, size);
        d.draw(canvas);
        return bmp;
    }

    private static final class Line {
        final String tag;
        final String title;

        Line(String tag, String title) {
            this.tag = tag;
            this.title = title;
        }
    }
}
