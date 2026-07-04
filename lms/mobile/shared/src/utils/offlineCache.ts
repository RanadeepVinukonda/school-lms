import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@genesis_lms_cache:';

export const offlineCache = {
  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(`${PREFIX}${key}`);
    } catch {
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(`${PREFIX}${key}`, value);
    } catch {
      // Storage full or unavailable
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(`${PREFIX}${key}`);
    } catch {
      // ignore
    }
  },

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch {
      // ignore
    }
  },
};
