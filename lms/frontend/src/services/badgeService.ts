/**
 * Launcher badge count (unread notifications). Uses @capawesome/capacitor-badge
 * which falls back to ShortcutBadger on Android (launcher dependent). All calls
 * are no-ops on non-native platforms.
 *
 * NOTE: the badge plugin must never be invoked on a platform where its native
 * implementation is not actually present. Calling methods on the unregistered
 * Badge proxy throws "Badge.then() is not implemented on web". This happens on
 * plain web AND inside the Android app's React-Native WebView: the Open-With
 * shim forces Capacitor.isNativePlatform() to return true (needed so the web
 * app's FileShare path routes to native), which would otherwise unlock the badge
 * path — but the WebView has no native Badge bridge, so actually invoking the
 * plugin throws. The gate below therefore also checks that the Badge native
 * plugin is truly available, not merely that the platform is reported native.
 */

import { Capacitor } from '@capacitor/core';

let badgeModule: any = null;
let badgeSupported: boolean | null = null;

async function getBadge(): Promise<any | null> {
  if (badgeSupported === false) return null;
  if (badgeModule) return badgeModule;
  try {
    if (!isBadgeSupported()) return null;
    const mod = await import('@capawesome/capacitor-badge');
    badgeModule = mod.Badge;
    badgeSupported = true;
    return badgeModule;
  } catch {
    badgeSupported = false;
    return null;
  }
}

/**
 * True only when the Badge plugin is genuinely available to run:
 *  - it must be a native platform, AND
 *  - the Badge plugin must be registered/available on it.
 *
 * The plugin is available only inside a real Capacitor native app (it is
 * reported there via the native plugin set). In a plain web browser this is
 * false because isNativePlatform() is false. Inside the Android app's
 * React-Native WebView, isNativePlatform() is faked true by the Open-With
 * shim, but isPluginAvailable('Badge') is still false because no native Badge
 * bridge exists there — so the plugin is never invoked and the "not
 * implemented on web" error cannot happen.
 */
export function isBadgeSupported(): boolean {
  try {
    if (!Capacitor.isNativePlatform()) return false;
    return Capacitor.isPluginAvailable('Badge');
  } catch {
    return false;
  }
}

/** Set the app icon badge to the number of unread notifications. */
export async function setBadgeCount(count: number): Promise<void> {
  const badge = await getBadge();
  if (!badge) return;
  try {
    await badge.set({ count });
  } catch {
    // Some launchers reject badge updates (e.g. no ShortcutBadger support).
  }
}

/** Clear the app icon badge. */
export async function clearBadge(): Promise<void> {
  const badge = await getBadge();
  if (!badge) return;
  try {
    await badge.clear();
  } catch {
    // Some launchers reject badge clearing (e.g. no ShortcutBadger support).
  }
}

/** Set the app icon badge to the number of unread notifications. */
export async function syncBadge(count: number): Promise<void> {
  if (count > 0) {
    await setBadgeCount(count);
  } else {
    await clearBadge();
  }
}
