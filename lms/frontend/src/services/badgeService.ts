/**
 * Launcher badge count (unread notifications). Uses @capawesome/capacitor-badge
 * which falls back to ShortcutBadger on Android (launcher dependent). All calls
 * are no-ops on non-native platforms.
 */

let badgeModule: any = null;
let badgeSupported: boolean | null = null;

async function getBadge(): Promise<any | null> {
  if (badgeSupported === false) return null;
  if (badgeModule) return badgeModule;
  try {
    const { Capacitor } = await import('@capacitor/core');
    if (!Capacitor.isNativePlatform()) {
      badgeSupported = false;
      return null;
    }
    const mod = await import('@capawesome/capacitor-badge');
    badgeModule = mod.Badge;
    badgeSupported = true;
    return badgeModule;
  } catch {
    badgeSupported = false;
    return null;
  }
}

/** Set the app icon badge to the number of unread notifications. */
export async function syncBadge(count: number): Promise<void> {
  const badge = await getBadge();
  if (!badge) return;
  try {
    if (count > 0) {
      await badge.set({ count });
    } else {
      await badge.clear();
    }
  } catch {
    // Some launchers reject badge updates (e.g. no ShortcutBadger support).
  }
}
