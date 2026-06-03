import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getInitials(name: string): string {
  if (!name) return '';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function formatDate(date: Date | string | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function getDueUrgency(dueDate: string): { label: string; variant: 'destructive' | 'warning' | 'secondary' | 'outline' } {
  const now = new Date();
  const due = new Date(dueDate);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return { label: 'Overdue', variant: 'destructive' };
  if (diffDays === 0) return { label: 'Due Today', variant: 'destructive' };
  if (diffDays === 1) return { label: 'Due Tomorrow', variant: 'warning' };
  if (diffDays <= 7) return { label: `${diffDays} days left`, variant: 'secondary' };
  return { label: due.toLocaleDateString(), variant: 'outline' };
}
