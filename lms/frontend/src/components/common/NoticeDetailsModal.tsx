import { useEffect, useRef, useState } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { Icon } from '@/components/ui/Icon';
import { registerBackHandler } from '@/lib/backHandler';
import { useClasses } from '@/hooks/useClasses';
import { formatClassName } from '@/services/classService';

interface NoticeDetailsModalProps {
  open: boolean;
  notice: Record<string, any> | null;
  onClose: () => void;
  t?: (key: string) => string;
}

function priorityBadgeContent(priority: string | undefined, t?: (key: string) => string) {
  switch (priority) {
    case 'high':
      return <span className="rounded-md bg-error-container text-on-error-container px-2 py-0.5 text-xs font-semibold">{t ? t('High') : 'High'}</span>;
    case 'medium':
      return <span className="rounded-md bg-warning-container text-on-warning-container px-2 py-0.5 text-xs font-semibold">{t ? t('Medium') : 'Medium'}</span>;
    case 'low':
      return <span className="rounded-md bg-primary-container text-on-primary-container px-2 py-0.5 text-xs font-semibold">{t ? t('Low') : 'Low'}</span>;
    default:
      return <span className="rounded-md bg-secondary-container text-on-secondary-container px-2 py-0.5 text-xs font-semibold">{t ? t('Normal') : 'Normal'}</span>;
  }
}

function formatLinks(links: unknown): string[] {
  if (Array.isArray(links)) {
    return links
      .map((l: any) => (typeof l === 'string' ? l : l?.url || l?.href || ''))
      .filter((u: string) => u)
      .filter((v, i, a) => a.indexOf(v) === i);
  }
  return [];
}

function formatAttachments(files: unknown): { name?: string; url?: string }[] {
  if (!Array.isArray(files)) return [];
  return files.map((f: any) => {
    if (typeof f === 'string') {
      return { name: f.split('/').pop() || f, url: f };
    }
    return { name: f?.name || f?.filename || (f?.url && f.url.split('/').pop()) || 'Attachment', url: f?.url || f?.href };
  });
}

export default function NoticeDetailsModal({ open, notice, onClose, t }: NoticeDetailsModalProps) {
  const { data: classes = [] } = useClasses();
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !notice) return;
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    return registerBackHandler(() => {
      onClose();
      return true;
    });
  }, [open, notice, onClose]);

  if (!notice) return null;

  const targetClass = notice.target_class_id
    ? classes.find((c: any) => c.id === notice.target_class_id)
    : undefined;

  const links = formatLinks(notice.links);
  const attachments = formatAttachments(
    notice.attachments || notice.files || notice.file_urls,
  );

  const tr = (key: string) => (t ? t(key) : key);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(val) => !val && onClose()}>

        {open && (
          <DialogPrimitive.Portal forceMount>
            <DialogPrimitive.Overlay asChild forceMount>
              <div
                className="fixed inset-0 z-[80] bg-black/60"
              />
            </DialogPrimitive.Overlay>

            <DialogPrimitive.Content asChild forceMount>
              <div
                className="fixed inset-x-0 bottom-0 z-[81] mx-auto w-full max-w-lg sm:max-w-md pb-[env(safe-area-inset-bottom)] bg-background rounded-t-[24px] shadow-2xl outline-none focus:outline-none"
              >
                <div className="flex items-center justify-center pt-3 pb-1">
                  <div className="h-1.5 w-12 rounded-full bg-border" />
                </div>

                <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 border-b border-border/60">
                  <div className="min-w-0">
                    <DialogPrimitive.Title asChild>
                      <h2 className="text-title-md font-bold leading-tight break-words">{notice.title}</h2>
                    </DialogPrimitive.Title>
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {priorityBadgeContent(notice.priority, t)}
                      {targetClass ? (
                        <span className="rounded-md border border-outline text-muted-foreground px-2 py-0.5 text-xs font-semibold">
                          {formatClassName(targetClass)}
                        </span>
                      ) : (
                        <span className="rounded-md bg-secondary-container text-on-secondary-container px-2 py-0.5 text-xs font-semibold">
                          {tr('All Classes')}
                        </span>
                      )}
                    </div>
                  </div>
                  <DialogPrimitive.Close asChild>
                    <button
                      type="button"
                      aria-label={tr('Close')}
                      className="shrink-0 rounded-full p-2 text-muted-foreground hover:bg-border/50 hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <Icon name="close" size={22} />
                    </button>
                  </DialogPrimitive.Close>
                </div>

                <div
                  ref={scrollRef}
                  className="max-h-[70dvh] overflow-y-auto overscroll-contain px-5 pb-8"
                >
                  {notice.content ? (
                    <div className="text-body-md text-foreground whitespace-pre-wrap break-words">
                      {notice.content}
                    </div>
                  ) : (
                    <p className="text-body-md text-muted-foreground">{tr('No content')}</p>
                  )}

                  <div className="mt-6 space-y-3 border-t border-border/60 pt-5">
                    <div className="flex items-start gap-3">
                      <Icon name="calendar_month" size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                      <div className="text-body-md">
                        <span className="text-muted-foreground">{tr('Published')}: </span>
                        {notice.created_at ? new Date(notice.created_at).toLocaleDateString() : '—'}
                      </div>
                    </div>
                    {notice.expires_at && (
                      <div className="flex items-start gap-3">
                        <Icon name="schedule" size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-body-md">
                          <span className="text-muted-foreground">{tr('Expires')}: </span>
                          {new Date(notice.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                    )}
                    {notice.created_by_name && (
                      <div className="flex items-start gap-3">
                        <Icon name="person" size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div className="text-body-md">
                          <span className="text-muted-foreground">{tr('Created by')}: </span>
                          {notice.created_by_role ? `${notice.created_by_role} - ` : ''}
                          {notice.created_by_name}
                        </div>
                      </div>
                    )}

                    {attachments.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Icon name="attach_file" size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className="text-muted-foreground text-body-md">{tr('Attachments')}</span>
                          {attachments.map((a, i) => (
                            <a
                              key={i}
                              href={a.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary underline underline-offset-2 break-all hover:text-primary/80"
                            >
                              {a.name}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {links.length > 0 && (
                      <div className="flex items-start gap-3">
                        <Icon name="link" size={18} className="text-muted-foreground mt-0.5 shrink-0" />
                        <div className="flex flex-col gap-1.5 min-w-0">
                          <span className="text-muted-foreground text-body-md">{tr('Related Links')}</span>
                          {links.map((url, i) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-primary underline underline-offset-2 break-all hover:opacity-80"
                            >
                              {url}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        )}

    </DialogPrimitive.Root>
  );
}