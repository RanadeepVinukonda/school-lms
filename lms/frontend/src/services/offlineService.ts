const OFFLINE_CACHE_KEY = 'lms-offline-content';
const OFFLINE_QUEUE_KEY = 'lms-offline-queue';
const MAX_STORAGE_BYTES = 50 * 1024 * 1024;

export interface OfflineContent {
  id: string;
  type: 'lesson' | 'concept' | 'textbook' | 'video';
  title: string;
  data: unknown;
  downloadedAt: string;
  sizeBytes: number;
}

export interface QueuedAction {
  id: string;
  type: 'assessment-submit' | 'sync-progress' | 'sync-results';
  payload: unknown;
  createdAt: string;
}

export const offlineService = {
  getContents(): OfflineContent[] {
    try {
      const raw = localStorage.getItem(OFFLINE_CACHE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  saveContent(content: OfflineContent): void {
    const contents = this.getContents();
    const existing = contents.findIndex((c) => c.id === content.id);
    if (existing >= 0) {
      contents[existing] = content;
    } else {
      contents.push(content);
    }
    this._setContents(contents);
  },

  removeContent(id: string): void {
    const contents = this.getContents().filter((c) => c.id !== id);
    this._setContents(contents);
  },

  getContent(id: string): OfflineContent | undefined {
    return this.getContents().find((c) => c.id === id);
  },

  isDownloaded(id: string): boolean {
    return !!this.getContent(id);
  },

  getStorageUsed(): { usedBytes: number; totalBytes: number; percentage: number } {
    const contents = this.getContents();
    const usedBytes = contents.reduce((acc, c) => acc + c.sizeBytes, 0);
    return {
      usedBytes,
      totalBytes: MAX_STORAGE_BYTES,
      percentage: Math.min(100, Math.round((usedBytes / MAX_STORAGE_BYTES) * 100)),
    };
  },

  clearAll(): void {
    localStorage.removeItem(OFFLINE_CACHE_KEY);
  },

  _setContents(contents: OfflineContent[]): void {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(contents));
  },

  getQueue(): QueuedAction[] {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  addToQueue(action: Omit<QueuedAction, 'id' | 'createdAt'>): void {
    const queue = this.getQueue();
    queue.push({
      ...action,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      createdAt: new Date().toISOString(),
    });
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  removeFromQueue(id: string): void {
    const queue = this.getQueue().filter((q) => q.id !== id);
    localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  },

  clearQueue(): void {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  },

  async syncQueue(): Promise<void> {
    const queue = this.getQueue();
    if (queue.length === 0) return;

    const { default: api } = await import('./api');

    for (const action of queue) {
      try {
        switch (action.type) {
          case 'assessment-submit':
            await api.post('/assessments/submit', action.payload);
            break;
          case 'sync-progress':
            await api.post('/progress/sync', action.payload);
            break;
          case 'sync-results':
            await api.post('/results/sync', action.payload);
            break;
        }
        this.removeFromQueue(action.id);
      } catch {
        break;
      }
    }
  },
};

export function getStorageEstimate(): string {
  const { usedBytes } = offlineService.getStorageUsed();
  const mb = usedBytes / (1024 * 1024);
  if (mb < 1) return `${Math.round(usedBytes / 1024)} KB`;
  return `${mb.toFixed(1)} MB`;
}

export function getStorageTotal(): string {
  const { totalBytes } = offlineService.getStorageUsed();
  const mb = totalBytes / (1024 * 1024);
  return `${mb.toFixed(0)} MB`;
}
