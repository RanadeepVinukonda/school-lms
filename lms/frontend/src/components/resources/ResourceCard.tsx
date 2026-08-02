import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Icon } from '@/components/ui/Icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import {
  type ResourceKind,
  type DetectableResource,
  detectResourceKind,
  detectDocumentKind,
  preferredThumbnail,
  thumbnailFallbacks,
  hostnameOf,
  faviconUrl,
  formatDuration,
  formatFileSize,
  labelForKind,
  documentArt,
  actionLabelForKind,
} from '@/lib/resourceUtils';

interface ResourceCardProps {
  resource: DetectableResource;
  /** Optional extra metadata row rendered under the title (e.g. subject / chapter). */
  meta?: string;
  /** Called instead of the default open-in-new-tab behaviour. */
  onOpen?: (resource: DetectableResource) => void;
  /** Extra element placed in the top-right of the content area (e.g. favourite). */
  action?: React.ReactNode;
  className?: string;
}

/** Gradient artwork shown while a thumbnail loads or when it fails. */
function ThumbArtwork({ kind, title, doc }: { kind: ResourceKind; title?: string | null; doc?: ReturnType<typeof detectDocumentKind> }) {
  if (kind === 'document' && doc) {
    const art = documentArt(doc);
    return (
      <div className={cn('h-full w-full bg-gradient-to-br flex flex-col items-center justify-center text-white gap-2 p-4', art.gradient)}>
        <Icon name={doc === 'file' ? 'description' : doc === 'gslides' ? 'slideshow' : doc === 'gsheets' ? 'table_chart' : 'description'} size={44} className="drop-shadow" />
        <span className="text-sm font-semibold text-white/95 text-center line-clamp-2">{title || art.label}</span>
      </div>
    );
  }
  if (kind === 'pdf') {
    return (
      <div className="h-full w-full bg-gradient-to-br from-rose-600 to-red-400 flex flex-col items-center justify-center text-white gap-2 p-4">
        <Icon name="picture_as_pdf" size={44} className="drop-shadow" />
        <span className="text-sm font-semibold text-white/95 text-center line-clamp-2">{title || 'PDF'}</span>
      </div>
    );
  }
  if (kind === 'khan_academy') {
    return (
      <div className="h-full w-full bg-gradient-to-br from-emerald-600 to-teal-400 flex flex-col items-center justify-center text-white gap-2 p-4">
        <Icon name="school" size={44} className="drop-shadow" />
        <span className="text-sm font-semibold text-white/95 text-center line-clamp-2">{title || 'Khan Academy'}</span>
      </div>
    );
  }
  if (kind === 'external') {
    return (
      <div className="h-full w-full bg-gradient-to-br from-slate-700 to-slate-500 flex flex-col items-center justify-center text-white gap-2 p-4">
        <Icon name="language" size={44} className="drop-shadow" />
        <span className="text-sm font-semibold text-white/95 text-center line-clamp-2">{hostnameOf(title) || 'External link'}</span>
      </div>
    );
  }
  if (kind === 'image') {
    return (
      <div className="h-full w-full bg-gradient-to-br from-violet-600 to-purple-400 flex items-center justify-center text-white">
        <Icon name="image" size={44} className="drop-shadow" />
      </div>
    );
  }
  // video fallback
  return (
    <div className="h-full w-full bg-gradient-to-br from-slate-800 to-slate-600 flex flex-col items-center justify-center text-white gap-3">
      <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white/15 backdrop-blur">
        <Icon name="play_arrow" size={40} />
      </div>
      <span className="text-xs font-medium text-white/80 text-center line-clamp-2 px-4">{title || 'Video'}</span>
    </div>
  );
}

/** Robust thumbnail: tries preferred then fallback urls, else artwork. */
function CardThumbnail({ resource, kind, title, onImageOpen }: {
  resource: DetectableResource;
  kind: ResourceKind;
  title?: string | null;
  onImageOpen?: () => void;
}) {
  const preferred = preferredThumbnail(resource);
  const fallbacks = thumbnailFallbacks(resource);
  const [candidate, setCandidate] = useState(0);
  const urls = preferred ? [preferred, ...fallbacks] : [];
  const [failed, setFailed] = useState(urls.length === 0);
  const doc = kind === 'document' ? detectDocumentKind(resource) : undefined;
  const src = urls[candidate];

  const handleError = () => {
    if (candidate + 1 < urls.length) setCandidate((c) => c + 1);
    else setFailed(true);
  };

  return (
    <div className="relative aspect-video w-full overflow-hidden bg-muted select-none" data-testid="resource-thumb">
      {src && !failed ? (
        <img
          src={src}
          alt={title || 'Resource preview'}
          loading="lazy"
          decoding="async"
          onError={handleError}
          className="h-full w-full object-cover"
        />
      ) : (
        <ThumbArtwork kind={kind} title={title} doc={doc} />
      )}

      {kind === 'image' && !failed && (
        <button
          type="button"
          onClick={onImageOpen}
          aria-label="View full screen"
          className="absolute inset-0 grid place-items-center bg-black/0 opacity-0 transition-all duration-200 hover:bg-black/30 hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none group-hover:opacity-100"
        >
          <span className="flex items-center justify-center w-14 h-14 rounded-full bg-white/20 backdrop-blur text-white">
            <Icon name="open_in_full" size={28} />
          </span>
        </button>
      )}
    </div>
  );
}

function ExternalPreview({ resource }: { resource: DetectableResource }) {
  const host = hostnameOf(resource.url);
  const favicon = faviconUrl(resource.url);
  const title = resource.title || host || 'External link';
  const desc = resource.description || '';
  return (
    <div className="flex items-start gap-3 p-3">
      {favicon && (
        <img src={favicon} alt="" className="mt-0.5 h-8 w-8 rounded-lg border border-border/60 bg-surface object-contain" loading="lazy" decoding="async" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold leading-snug line-clamp-2">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5 truncate">{host}</p>
        {desc && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{desc}</p>}
      </div>
    </div>
  );
}

export function ResourceCard({ resource, meta, onOpen, action, className }: ResourceCardProps) {
  const kind = detectResourceKind(resource);
  const [imageOpen, setImageOpen] = useState(false);
  const duration = kind === 'video' ? formatDuration(resource.duration) : '';
  const doc = kind === 'document' ? documentArt(detectDocumentKind(resource)) : null;

  const open = () => {
    if (onOpen) {
      onOpen(resource);
      return;
    }
    if (resource.url) window.open(resource.url, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <article
        className={cn(
          'group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-elevation-2 hover:border-border',
          className,
        )}
      >
        <CardThumbnail
          resource={resource}
          kind={kind}
          title={resource.title}
          onImageOpen={() => kind === 'image' && setImageOpen(true)}
        />

        <div className="flex flex-1 flex-col p-4">
          {/* badges */}
          <div className="flex items-center gap-1.5 mb-2">
            <Badge variant="secondary" className="text-[10px] normal-case">
              {kind === 'khan_academy' ? 'Khan Academy' : labelForKind(kind)}
            </Badge>
            {kind === 'document' && doc && (
              <Badge variant="outline" className="text-[10px] normal-case">{doc.label}</Badge>
            )}
            {duration && <Badge variant="outline" className="text-[10px] normal-case">{duration}</Badge>}
            {resource.channelName && (
              <Badge variant="outline" className="text-[10px] normal-case truncate max-w-[8rem]">{resource.channelName}</Badge>
            )}
          </div>

          {/* title — clamped, never overlapping the thumbnail */}
          <h3 className="text-title-sm font-semibold leading-snug line-clamp-2 min-h-[2.6rem]">
            {resource.title || resource.conceptTitle || 'Untitled resource'}
          </h3>

          {/* meta row */}
          <div className="flex items-center gap-2 mt-1.5 text-label-sm text-muted-foreground">
            {resource.conceptTitle && <span className="truncate">{resource.conceptTitle}</span>}
            {meta && <span className="truncate">{meta}</span>}
            {kind === 'pdf' && formatFileSize(resource.size) && (
              <span className="flex-shrink-0">{formatFileSize(resource.size)}</span>
            )}
          </div>

          {/* footer actions */}
          <div className="mt-auto pt-4 flex items-center justify-between gap-2">
            <Button size="sm" className="gap-1.5 flex-shrink-0" onClick={open}>
              <Icon name={kind === 'video' ? 'play_arrow' : kind === 'image' ? 'open_in_full' : 'open_in_new'} size={16} />
              {actionLabelForKind(kind)}
            </Button>
            {action && <div className="flex-shrink-0">{action}</div>}
          </div>
        </div>

        {/* external site preview strip for external links */}
        {kind === 'external' && <ExternalPreview resource={resource} />}
      </article>

      <Dialog open={imageOpen} onOpenChange={setImageOpen}>
        <DialogContent className="max-w-4xl bg-black/95 border-0 p-2 sm:p-3" aria-describedby={undefined}>
          <DialogTitle className="sr-only">{resource.title || 'Resource preview'}</DialogTitle>
          {resource.url && (
            <img
              src={resource.url}
              alt={resource.title || 'Resource preview'}
              className="mx-auto max-h-[85dvh] w-auto rounded-xl object-contain"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Skeleton placeholder that matches ResourceCard's shape. */
export function ResourceCardSkeleton() {
  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface">
      <div className="shimmer aspect-video w-full bg-surface-variant" />
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex gap-1.5">
          <div className="shimmer h-5 w-16 rounded-md bg-surface-variant" />
          <div className="shimmer h-5 w-12 rounded-md bg-surface-variant" />
        </div>
        <div className="shimmer h-4 w-full rounded-md bg-surface-variant" />
        <div className="shimmer h-4 w-3/4 rounded-md bg-surface-variant" />
        <div className="mt-auto pt-4">
          <div className="shimmer h-9 w-24 rounded-lg bg-surface-variant" />
        </div>
      </div>
    </div>
  );
}
