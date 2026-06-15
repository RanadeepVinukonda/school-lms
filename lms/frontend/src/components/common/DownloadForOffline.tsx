import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/Icon';
import { offlineService, getStorageEstimate, getStorageTotal } from '@/services/offlineService';
import { useTranslation } from '@/hooks/useTranslation';
import type { OfflineContent } from '@/services/offlineService';

interface DownloadForOfflineProps {
  contentId: string;
  contentType: OfflineContent['type'];
  title: string;
  onDownload?: (contentId: string) => Promise<unknown>;
}

export function DownloadForOffline({ contentId, contentType, title, onDownload }: DownloadForOfflineProps) {
  const { t } = useTranslation();
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState<'idle' | 'downloading' | 'done' | 'error'>(
    offlineService.isDownloaded(contentId) ? 'done' : 'idle',
  );

  const handleDownload = useCallback(async () => {
    if (status === 'done') {
      offlineService.removeContent(contentId);
      setStatus('idle');
      return;
    }

    setStatus('downloading');
    setProgress(0);

    try {
      const simulateProgress = () => {
        let p = 0;
        const interval = setInterval(() => {
          p += Math.random() * 15;
          if (p >= 90) {
            p = 90;
            clearInterval(interval);
          }
          setProgress(Math.min(90, Math.round(p)));
        }, 300);
        return interval;
      };

      const progInterval = simulateProgress();
      let data: unknown = null;

      if (onDownload) {
        data = await onDownload(contentId);
      } else {
        await new Promise((r) => setTimeout(r, 1500));
        data = { mock: true, id: contentId };
      }

      clearInterval(progInterval);
      setProgress(100);

      offlineService.saveContent({
        id: contentId,
        type: contentType,
        title,
        data,
        downloadedAt: new Date().toISOString(),
        sizeBytes: Math.round(Math.random() * 50000 + 10000),
      });

      setTimeout(() => {
        setStatus('done');
        setProgress(null);
      }, 500);
    } catch {
      setStatus('error');
      setProgress(null);
    }
  }, [contentId, contentType, title, onDownload, status]);

  const storage = offlineService.getStorageUsed();

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Button
          variant={status === 'done' ? 'secondary' : 'outline'}
          size="sm"
          onClick={handleDownload}
          disabled={status === 'downloading'}
        >
          <Icon
            name={status === 'done' ? 'cloud_done' : status === 'downloading' ? 'cloud_download' : 'cloud_download'}
            size={18}
            className="mr-1"
          />
          {status === 'done' ? t('common.downloaded') : status === 'downloading' ? t('common.downloadProgress') : t('common.downloadOffline')}
        </Button>
        {status === 'done' && (
          <Badge variant="success">
            <Icon name="check" size={12} className="mr-0.5" />
            {t('common.downloaded')}
          </Badge>
        )}
        {status === 'error' && (
          <Badge variant="destructive">{t('common.error')}</Badge>
        )}
      </div>
      {status === 'downloading' && progress !== null && (
        <Progress value={progress} size="sm" />
      )}
      {status === 'done' && (
        <p className="text-xs text-on-surface-variant">
          {t('common.storageUsed')}: {getStorageEstimate()} / {getStorageTotal()} ({storage.percentage}%)
        </p>
      )}
    </div>
  );
}

export function OfflineBadge({ contentId }: { contentId: string }) {
  if (!offlineService.isDownloaded(contentId)) return null;
  return (
    <Badge variant="success" className="text-xs">
      <Icon name="cloud_done" size={12} className="mr-0.5" />
      Offline
    </Badge>
  );
}

export function ManageDownloads() {
  const { t } = useTranslation();
  const [contents, setContents] = useState(offlineService.getContents());

  const handleRemove = (id: string) => {
    offlineService.removeContent(id);
    setContents(offlineService.getContents());
  };

  const handleClearAll = () => {
    offlineService.clearAll();
    setContents([]);
  };

  const storage = offlineService.getStorageUsed();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">{t('common.manageDownloads')}</h3>
        {contents.length > 0 && (
          <Button variant="destructive" size="sm" onClick={handleClearAll}>
            {t('common.clearAll') || 'Clear All'}
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs text-on-surface-variant">
        <Icon name="storage" size={16} />
        <span>
          {getStorageEstimate()} / {getStorageTotal()} ({storage.percentage}%)
        </span>
      </div>

      {contents.length === 0 && (
        <p className="text-sm text-on-surface-variant">{t('common.noData')}</p>
      )}

      <div className="space-y-2">
        {contents.map((content) => (
          <div
            key={content.id}
            className="flex items-center justify-between rounded-lg border border-outline-variant p-3"
          >
            <div className="flex items-center gap-3">
              <Icon
                name={
                  content.type === 'lesson' ? 'menu_book' :
                  content.type === 'concept' ? 'lightbulb' :
                  content.type === 'textbook' ? 'book' : 'videocam'
                }
                size={20}
                className="text-primary"
              />
              <div>
                <p className="text-sm font-medium">{content.title}</p>
                <p className="text-xs text-on-surface-variant">
                  {new Date(content.downloadedAt).toLocaleDateString()} &middot;{' '}
                  {content.sizeBytes > 1024 * 1024
                    ? `${(content.sizeBytes / (1024 * 1024)).toFixed(1)} MB`
                    : `${Math.round(content.sizeBytes / 1024)} KB`}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon-sm" onClick={() => handleRemove(content.id)}>
              <Icon name="delete" size={18} />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
