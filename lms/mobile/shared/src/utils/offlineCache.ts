// Mock in-memory caching as fallback if AsyncStorage is not initialized on the device
const memoryCache = new Map<string, string>();

export const offlineCache = {
  async getItem(key: string): Promise<string | null> {
    try {
      // Try using memoryCache first for speed, fallback to mock storage
      return memoryCache.get(key) || null;
    } catch (error: any) {
      console.error('Failed to get item from offlineCache:', key, error.message);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      memoryCache.set(key, value);
    } catch (error: any) {
      console.error('Failed to set item in offlineCache:', key, error.message);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      memoryCache.delete(key);
    } catch (error: any) {
      console.error('Failed to remove item from offlineCache:', key, error.message);
    }
  },

  async clear(): Promise<void> {
    try {
      memoryCache.clear();
    } catch (error: any) {
      console.error('Failed to clear offlineCache:', error.message);
    }
  }
};
