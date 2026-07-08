import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (Platform.OS === 'web') return null;

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  return tokenData.data;
}

export function setupNotificationListeners(
  onNotification: (data: Record<string, unknown>) => void,
  onResponse: (data: Record<string, unknown>) => void,
) {
  const notifListener = Notifications.addNotificationReceivedListener(notification => {
    onNotification(notification.request.content.data ?? {});
  });
  const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
    onResponse(response.notification.request.content.data ?? {});
  });
  return () => {
    notifListener.remove();
    responseListener.remove();
  };
}
