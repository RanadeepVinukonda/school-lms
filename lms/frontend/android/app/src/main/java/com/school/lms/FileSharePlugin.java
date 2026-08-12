package com.school.lms;

import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.util.Base64;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;

/**
 * Genesis file-export bridge.
 *
 * Android WebViews silently swallow browser-style {@code <a download>} clicks,
 * so the web layer can never download a real file on its own. This plugin:
 *
 *  1. Decodes the file payload from the web layer (base64) and writes a real
 *     file into the app cache.
 *  2. Exposes it to other apps through a FileProvider {@code content://} URI
 *     (never a raw {@code file://} URI).
 *  3. Launches the system "Open With" chooser (ACTION_VIEW) so the file can be
 *     opened in Excel, Google Sheets, Drive, etc. — falling back to the share
 *     sheet (ACTION_SEND → Save to Files / messaging) when no app can open it.
 *
 * No clipboard involved: the user always gets a real file + system chooser.
 */
@CapacitorPlugin(name = "FileShare")
public class FileSharePlugin extends Plugin {

    @PluginMethod
    public void open(PluginCall call) {
        String filename = call.getString("filename");
        String content = call.getString("content"); // base64 payload
        String mimeType = call.getString("mimeType", "text/csv");

        if (filename == null || filename.trim().isEmpty()) {
            call.reject("filename is required");
            return;
        }
        if (content == null || content.isEmpty()) {
            call.reject("content is required");
            return;
        }
        if (getActivity() == null) {
            call.reject("No activity available to open a chooser", "ACTIVITY_MISSING");
            return;
        }

        try {
            File dir = new File(getContext().getCacheDir(), "exports");
            if (!dir.exists() && !dir.mkdirs()) {
                call.reject("Could not create the export directory", "EXPORT_FAILED");
                return;
            }

            // Keep the filename filesystem-safe while preserving its extension.
            String safeName = filename.replaceAll("[^a-zA-Z0-9._-]", "_");
            File file = new File(dir, safeName);

            byte[] data = Base64.decode(content, Base64.DEFAULT);
            try (FileOutputStream fos = new FileOutputStream(file)) {
                fos.write(data);
            }

            Uri uri = FileProvider.getUriForFile(
                    getContext(),
                    getContext().getPackageName() + ".fileprovider",
                    file);

            // 1) "Open With" — Excel / Google Sheets / any compatible handler.
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, mimeType);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // MATCH_ALL: on Android 11+ (package visibility) matching apps are
            // invisible without <queries>; MATCH_ALL sees every handler so the
            // chooser is offered even when Excel/Sheets are installed.
            PackageManager pm = getContext().getPackageManager();
            if (pm.resolveActivity(view, PackageManager.MATCH_ALL) != null) {
                Intent chooser = Intent.createChooser(view, "Open " + safeName + " with");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                call.resolve(new JSObject().put("status", "view"));
                return;
            }

            // 2) Share sheet — Save to Files / Drive / messaging apps.
            Intent send = new Intent(Intent.ACTION_SEND);
            send.setType(mimeType);
            send.putExtra(Intent.EXTRA_STREAM, uri);
            send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
            send.setClipData(ClipData.newUri(getContext().getContentResolver(), safeName, uri));

            if (pm.resolveActivity(send, PackageManager.MATCH_ALL) != null) {
                Intent chooser = Intent.createChooser(send, "Share " + safeName);
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                call.resolve(new JSObject().put("status", "send"));
                return;
            }

            call.reject("No app available to open or share this file", "NO_HANDLER");
        } catch (Exception e) {
            call.reject("EXPORT_FAILED", "Failed to export file: " + e.getMessage(), e);
        }
    }
}
