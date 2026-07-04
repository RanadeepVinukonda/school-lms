import { Platform, Alert, Linking } from 'react-native';

type PermissionStatus = 'granted' | 'denied' | 'undetermined' | 'blocked';

interface PermissionModule {
  requestAsync: (permission: string) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  getAsync: (permission: string) => Promise<{ granted: boolean; canAskAgain: boolean }>;
  CAMERA: string;
  RECORD_AUDIO: string;
}

let ExpoPermissions: PermissionModule | null = null;

try {
  ExpoPermissions = require('expo-image-picker');
} catch {
  // expo-image-picker not available
}

async function checkAndRequest(permissionType: 'camera' | 'microphone'): Promise<boolean> {
  if (!ExpoPermissions) {
    Alert.alert(
      'Permission Error',
      `This device needs ${permissionType} access for this feature. Please grant permission in Settings.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ]
    );
    return false;
  }

  const permission = permissionType === 'camera' ? ExpoPermissions.CAMERA : ExpoPermissions.RECORD_AUDIO;

  try {
    const { granted, canAskAgain } = await ExpoPermissions.getAsync(permission);
    if (granted) return true;

    if (!canAskAgain) {
      Alert.alert(
        'Permission Required',
        `Please enable ${permissionType} access in Settings to use this feature.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ]
      );
      return false;
    }

    const result = await ExpoPermissions.requestAsync(permission);
    return result.granted;
  } catch {
    return false;
  }
}

export const permissions = {
  requestCamera: () => checkAndRequest('camera'),
  requestMicrophone: () => checkAndRequest('microphone'),
};
