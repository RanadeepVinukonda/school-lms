/**
 * Launcher badge count (unread notifications). Uses @capawesome/capacitor-badge
 * which falls back to ShortcutBadger on Android (launcher dependent). All calls
 * are no-ops on non-native platforms.
 *
 * NOTE: the badge plugin must never be invoked on web — calling methods on the
 * unregistered Badge proxy throws "Badge.then() is not implemented on web". The
 * platform gate below is therefore strict (Android/iOS native only) and every
 * public method is safe to call from any platform.
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
 * True only on native platforms where the launcher badge plugin actually runs.
 * Guards the dynamic import so Badge is never touched on web.
 */
export function isBadgeSupported(): boolean {
  try {
    return Capacitor.isNativePlatform();
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
