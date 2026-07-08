import { create } from 'zustand';
import { supabase } from '@/supabase/config';

interface NotificationStore {
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  incrementUnread: () => void;
  decrementUnread: () => void;
  resetUnread: () => void;
  /** Subscribe to Realtime notifications for a given user ID. Returns unsubscribe function. */
  subscribeToNotifications: (userId: string) => () => void;
}

export const useNotificationStore = create<NotificationStore>((set, get) => ({
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),
  incrementUnread: () => set({ unreadCount: get().unreadCount + 1 }),
  decrementUnread: () =>
    set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  resetUnread: () => set({ unreadCount: 0 }),

  subscribeToNotifications: (userId: string) => {
    const channel = supabase
      .channel(`notifications_${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `userId=eq.${userId}`,
        },
        () => {
          set((state) => ({ unreadCount: state.unreadCount + 1 }));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  },
}));
