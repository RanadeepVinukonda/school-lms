import { Platform, Alert, Linking } from 'react-native';

let ImagePicker: any = null;
try {
  ImagePicker = require('expo-image-picker');
} catch {
  // expo-image-picker not available
}

let AudioModule: any = null;
try {
  AudioModule = require('expo-av');
} catch {
  // expo-av not available
}

async function requestCamera(): Promise<boolean> {
  if (ImagePicker && typeof ImagePicker.requestCameraPermissionsAsync === 'function') {
    try {
      const { status, canAskAgain } = await ImagePicker.getCameraPermissionsAsync();
      if (status === 'granted') return true;

      if (status === 'denied' && !canAskAgain) {
        Alert.alert(
          'Permission Required',
          'Please enable camera access in Settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      const result = await ImagePicker.requestCameraPermissionsAsync();
      return result.status === 'granted';
    } catch {
      return false;
    }
  }

  if (Platform.OS === 'web') return true;

  Alert.alert(
    'Permission Error',
    'Camera access is needed for this feature. Please grant permission in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

async function requestMicrophone(): Promise<boolean> {
  if (AudioModule && AudioModule.Audio && typeof AudioModule.Audio.requestPermissionsAsync === 'function') {
    try {
      const { status, canAskAgain } = await AudioModule.Audio.getPermissionsAsync();
      if (status === 'granted') return true;

      if (status === 'denied' && !canAskAgain) {
        Alert.alert(
          'Permission Required',
          'Please enable microphone access in Settings to use this feature.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ]
        );
        return false;
      }

      const result = await AudioModule.Audio.requestPermissionsAsync();
      return result.status === 'granted';
    } catch {
      return false;
    }
  }

  if (Platform.OS === 'web') return true;

  Alert.alert(
    'Permission Error',
    'Microphone access is needed for this feature. Please grant permission in Settings.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ]
  );
  return false;
}

export const permissions = {
  requestCamera,
  requestMicrophone,
};
