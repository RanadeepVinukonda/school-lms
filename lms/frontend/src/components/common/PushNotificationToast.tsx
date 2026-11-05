import {
  Bell, Star, FileText, HelpCircle, MessageSquare, Calendar, Info, AlertTriangle,
  MessageCircle, Siren, X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

type Priority = 'urgent' | 'high' | 'medium' | 'low';
const TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  grade: Star, assignment: FileText, exam: HelpCircle, message: MessageSquare,
  schedule: Calendar, system: Info, warning: AlertTriangle,
  quiz: HelpCircle, attendance: Calendar, submission: FileText,
  report: Siren, welcome: Bell, quiz_created: HelpCircle, quiz_published: HelpCircle,
  assignment_created: FileText, exam_created: HelpCircle, result_published: Star,
  attendance_marked: Calendar, attendance_alert: AlertTriangle, submission_graded: Star,
  regrade_requested: MessageCircle, timetable_updated: Calendar, new_registration: Info,
  parent_registration: Info, system_alert: AlertTriangle, performance_report: Star,
  teacher_message: MessageSquare,
  announcement: Info, notice: Info, re_teach: AlertTriangle, fee_reminder: Calendar,
  content_published: FileText, test_published: HelpCircle, test_submitted: FileText,
  registration: Info, login: Info,
};

const PRIORITY_ACCENT: Record<Priority, { border: string; chip: string; label: string }> = {
  urgent: { border: 'border-l-destructive', chip: 'bg-destructive/10 text-destructive', label: 'Urgent' },
  high:   { border: 'border-l-warning',     chip: 'bg-warning/10 text-warning',         label: 'High priority' },
  medium: { border: 'border-l-primary',     chip: 'bg-primary/10 text-primary',         label: 'General' },
  low:    { border: 'border-l-border',      chip: 'bg-muted text-muted-foreground',     label: 'Updates' },
};

function derivePriority(type?: string): Priority {
  if (type === 'exam' || type === 're_teach') return 'urgent';
  if (type === 'grade' || type === 'warning' || type === 'fee_reminder') return 'high';
  if (type === 'assignment' || type === 'message' || type === 'schedule' || type === 'announcement' || type === 'notice') return 'medium';
  return 'low';
}

function relativeTime(iso: string | number | undefined): string {
  if (!iso) return '';
  const t = typeof iso === 'number' ? iso : new Date(iso).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'yesterday';
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface PushNotificationToastProps {
  id: string | number;
  title?: string;
  body?: string;
  type?: string;
  timestamp?: string | number;
  onOpen?: () => void;
}

export function PushNotificationToast({ id, title, body, type, timestamp, onOpen }: PushNotificationToastProps) {
  const priority = derivePriority(type);
  const IconComp = TYPE_ICONS[type || ''] ?? Bell;
  const accent = PRIORITY_ACCENT[priority];

  return (
    <div




      className={cn(
        'pointer-events-auto relative w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-border/70 bg-surface shadow-lg shadow-black/5 backdrop-blur',
        'border-l-2',
        accent.border,
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3 p-3.5">
        <span className={cn('mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full', accent.chip)}>
          <IconComp className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-title-sm font-semibold">{title || 'Notification'}</p>
            <button
              type="button"
              onClick={() => toast.dismiss(id)}
              className="shrink-0 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Dismiss notification"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          {body && <p className="mt-0.5 line-clamp-2 text-label-sm text-muted-foreground">{body}</p>}
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-label-xs text-muted-foreground/70">{relativeTime(timestamp)}</span>
            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider', accent.chip)}>
              {accent.label}
            </span>
          </div>
        </div>
      </div>
      {onOpen && (
        <button
          type="button"
          onClick={() => {
            toast.dismiss(id);
            onOpen();
          }}
          className="block w-full border-t border-border/60 bg-muted/30 px-4 py-2 text-center text-label-sm font-semibold text-primary transition-colors hover:bg-muted/60"
        >
          Open
        </button>
      )}
    </div>
  );
}
