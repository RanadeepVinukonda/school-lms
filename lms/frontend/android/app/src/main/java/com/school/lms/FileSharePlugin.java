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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

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
 *  3. Opens the CSV straight into Excel (or Microsoft 365) when installed — the
 *     file opens as a spreadsheet with no chooser in between. Otherwise it
 *     launches the system "Open With" chooser (ACTION_VIEW) and finally falls
 *     back to the share sheet (ACTION_SEND → Save to Files / messaging).
 *
 * No clipboard involved: the user always gets a real file + spreadsheet.
 */
@CapacitorPlugin(name = "FileShare")
public class FileSharePlugin extends Plugin {

    /** Excel / Microsoft 365 package names, newest first. */
    private static final String[] EXCEL_PACKAGES = {
        "com.microsoft.office.excel",
        "com.microsoft.office.officehubrow",
        "com.microsoft.office.officehub",
    };

    /**
     * Spreadsheet MIME types Excel understands for CSV data, most-registered
     * first. Excel on Android is picky: several versions only register
     * {@code application/vnd.ms-excel} and {@code text/comma-separated-values}
     * (not {@code text/csv}), so those are tried before the plain CSV type.
     */
    private static final String[] CSV_MIMES = {
        "application/vnd.ms-excel",
        "text/comma-separated-values",
        "application/csv",
        "text/csv",
    };

    /**
     * Try to open the file directly in Excel / Microsoft 365. Returns true when
     * an Excel app was launched — the CSV then opens as a spreadsheet without
     * any chooser in between.
     */
    private boolean openInExcel(Uri uri, String mimeType) {
        PackageManager pm = getContext().getPackageManager();
        List<String> mimes = new ArrayList<>();
        if (mimeType != null && !mimeType.isEmpty() && !mimes.contains(mimeType)) mimes.add(mimeType);
        for (String m : CSV_MIMES) {
            if (!mimes.contains(m)) mimes.add(m);
        }

        for (String pkg : EXCEL_PACKAGES) {
            for (String mime : mimes) {
                Intent intent = new Intent(Intent.ACTION_VIEW);
                intent.setDataAndType(uri, mime);
                intent.setPackage(pkg);
                intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                if (pm.resolveActivity(intent, PackageManager.MATCH_ALL) != null) {
                    getActivity().startActivity(intent);
                    return true;
                }
            }
        }
        return false;
    }
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

            PackageManager pm = getContext().getPackageManager();

            // 1) Prefer Excel / Microsoft 365 — the CSV opens as a spreadsheet
            //    directly, no chooser in between.
            if (openInExcel(uri, mimeType)) {
                call.resolve(new JSObject().put("status", "excel"));
                return;
            }

            // 2) "Open With" — any compatible handler (Google Sheets cannot open
            //    CSVs this way, so Excel is the primary spreadsheet target).
            Intent view = new Intent(Intent.ACTION_VIEW);
            view.setDataAndType(uri, mimeType);
            view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

            // MATCH_ALL: on Android 11+ (package visibility) matching apps are
            // invisible without <queries>; MATCH_ALL sees every handler so the
            // chooser is offered even when Excel/Sheets are installed.
            if (pm.resolveActivity(view, PackageManager.MATCH_ALL) != null) {
                Intent chooser = Intent.createChooser(view, "Open " + safeName + " with");
                chooser.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                getActivity().startActivity(chooser);
                call.resolve(new JSObject().put("status", "view"));
                return;
            }

            // 3) Share sheet — Save to Files / Drive / messaging apps.
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
