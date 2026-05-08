import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from './supabase';
import { useProfile } from './useProfile';

export type Notification = {
  id: string;
  type: 'study_processed' | 'ocr_low_quality' | 'invitation_accepted' | 'system';
  title: string;
  body: string | null;
  read: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

type NotificationsCtx = {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
};

const Ctx = createContext<NotificationsCtx>({
  notifications: [],
  unreadCount: 0,
  markAllRead: async () => {},
  refresh: async () => {},
});

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useProfile();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const fetch = useCallback(async () => {
    if (!profile) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('notifications')
      .select('id,type,title,body,read,metadata,created_at')
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(50) as { data: Notification[] | null };
    if (data) setNotifications(data);
  }, [profile?.id]);

  useEffect(() => {
    if (!profile) return;
    fetch();

    const ch = supabase
      .channel(`notifications:${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `profile_id=eq.${profile.id}`,
      }, () => { fetch(); })
      .subscribe();

    channelRef.current = ch;
    return () => { ch.unsubscribe(); };
  }, [profile?.id, fetch]);

  const markAllRead = useCallback(async () => {
    if (!profile) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from('notifications')
      .update({ read: true })
      .eq('profile_id', profile.id)
      .eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, [profile?.id]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Ctx.Provider value={{ notifications, unreadCount, markAllRead, refresh: fetch }}>
      {children}
    </Ctx.Provider>
  );
}

export function useNotifications() {
  return useContext(Ctx);
}
