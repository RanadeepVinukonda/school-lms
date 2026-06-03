import { getAnalytics, isSupported, logEvent } from 'firebase/analytics';
import app from './config';

let analytics: ReturnType<typeof getAnalytics> | null = null;

export async function initAnalytics() {
  const supported = await isSupported();
  if (supported) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

export function trackEvent(eventName: string, params?: Record<string, unknown>) {
  if (analytics) {
    logEvent(analytics, eventName, params);
  }
}

export { analytics };
