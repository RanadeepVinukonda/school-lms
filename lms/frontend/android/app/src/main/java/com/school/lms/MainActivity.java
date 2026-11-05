package com.school.lms;

import android.app.DownloadManager;
import android.content.Context;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.DownloadListener;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.annotation.Nullable;

import com.getcapacitor.BridgeActivity;

/**
 * Genesis native entry point.
 *
 * Only additive Android behavior is configured here so the existing web app is
 * left untouched:
 *  - Embedded videos (YouTube, uploaded lessons) are allowed to start playback
 *    on Android where the page does not use a native user gesture.
 *  - Zoom controls are disabled (the app manages its own responsive layouts).
 *  - HTTP(S) file downloads (PDFs, images, resources) are handed to the Android
 *    DownloadManager so they land in the system Downloads folder.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(@Nullable Bundle savedInstanceState) {
        // FileShare: real CSV/PDF export through the Android Open With / Share
        // chooser (content:// URI via FileProvider). Registered before the
        // bridge is built so the web layer can call Capacitor.Plugins.FileShare.
        registerPlugin(FileSharePlugin.class);
        super.onCreate(savedInstanceState);

        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Drop the WebView disk cache so a stale hosted bundle can never
            // reappear: the app always loads the latest UI from the server.
            webView.clearCache(true);
            configureWebView(webView);
        }
        getBridge().getWebView().setDownloadListener(downloadListener);
    }

    /**
     * The WebView content is kept in the signed safe-area offset below the
     * system status bar (see capacitor.config.ts StatusBar.overlaysWebView =
     * false). The native Android status bar stays fully system-managed:
     * time, battery, network, notifications and quick-settings remain as the
     * OS renders them — we never draw our own status UI and never hide the bar.
     */
    private void configureWebView(WebView webView) {
        // Keep the window the same colour as the on-screen Genesis splash so
        // there is no flash while the hosted page loads. Matches the web app's
        // bg-primary navy (#233661) — the in-app splash renders in this colour.
        webView.setBackgroundColor(0xFF233661);
        WebSettings settings = webView.getSettings();
        // Let media play without requiring a user gesture (matches desktop).
        settings.setMediaPlaybackRequiresUserGesture(false);
        // The web app provides its own responsive, scrollable UI.
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setSupportZoom(false);
        // Disable multiple WebView windows so target="_blank" can't fragment the app.
        settings.setSupportMultipleWindows(false);
        settings.setJavaScriptCanOpenWindowsAutomatically(true);
        // Keep the bridge secure: never allow file access, never allow mixed content.
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        }
        settings.setDomStorageEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setTextZoom(100);
    }

    private final DownloadListener downloadListener = (url, userAgent, contentDisposition, mimeType, contentLength) -> {
        try {
            String fileName = URLUtil.guessFileName(url, contentDisposition, mimeType);
            DownloadManager.Request request =
                    new DownloadManager.Request(Uri.parse(url))
                            .setMimeType(mimeType != null ? mimeType : "application/octet-stream")
                            .addRequestHeader("User-Agent", userAgent)
                            .setTitle(fileName)
                            .setDescription("Genesis LMS download")
                            .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                            .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);

            String cookies = CookieManager.getInstance().getCookie(url);
            if (cookies != null) {
                request.addRequestHeader("Cookie", cookies);
            }

            DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
            if (manager != null) {
                manager.enqueue(request);
            }
        } catch (Exception ignored) {
            // Fall through: some downloads are handled by the web app itself (blob URLs).
        }
    };

    @Override
    public void onResume() {
        super.onResume();
        // Ensure cookies/session state is current after returning to the app.
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.resumeTimers();
        }
    }

    @Override
    public void onPause() {
        super.onPause();
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            webView.pauseTimers();
        }
    }
}