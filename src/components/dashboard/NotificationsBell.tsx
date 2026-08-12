'use client';

import React, { useState, useEffect } from 'react';
import { Bell, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { timeAgo, cn } from '@/lib/utils';
import { toast } from 'sonner';

interface NotificationsBellProps {
  userId: string;
  orgId: string;
  initialCount: number;
}

export function NotificationsBell({ userId, orgId, initialCount }: NotificationsBellProps) {
  const [unreadCount, setUnreadCount] = useState(initialCount);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  // Subscribe to realtime notifications
  useEffect(() => {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setUnreadCount(prev => prev + 1);
          setNotifications(prev => [payload.new, ...prev]);
          toast(payload.new.title, {
            description: payload.new.message,
            icon: '🔔',
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Load notifications when bell is clicked
  const handleOpen = async () => {
    if (!open) {
      setLoading(true);
      try {
        const res = await fetch('/api/notifications');
        const data = await res.json();
        if (data.data) setNotifications(data.data);
      } catch (err) {
        console.error('Failed to load notifications', err);
      } finally {
        setLoading(false);
      }
    }
    setOpen(!open);
  };

  const markAllRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mark_all_read: true }),
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    setUnreadCount(prev => Math.max(0, prev - 1));
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const typeIcon: Record<string, string> = {
    risk_alert:       '⚠️',
    policy_update:    '📄',
    audit_reminder:   '📋',
    compliance_change:'🛡️',
    system:           '🔔',
    subscription:     '💳',
  };

  return (
    <div className="relative">
      <button
        onClick={handleOpen}
        className="relative p-1 rounded hover:bg-muted transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 bottom-10 z-50 w-80 bg-background border border-border rounded-xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Mark all read
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-border">
              {loading && (
                <div className="py-8 text-center text-xs text-muted-foreground">Loading...</div>
              )}

              {!loading && notifications.length === 0 && (
                <div className="py-8 text-center">
                  <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">No notifications yet</p>
                </div>
              )}

              {!loading && notifications.map(n => (
                <div
                  key={n.id}
                  className={cn(
                    'flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors',
                    !n.is_read && 'bg-brand-50/50 dark:bg-brand-900/10'
                  )}
                >
                  <span className="text-base shrink-0 mt-0.5">{typeIcon[n.type] || '🔔'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={cn('text-xs font-medium text-foreground', !n.is_read && 'font-semibold')}>
                      {n.title}
                    </p>
                    {n.message && (
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={() => markRead(n.id)}
                      className="shrink-0 p-1 rounded hover:bg-muted"
                      title="Mark as read"
                    >
                      <Check className="w-3 h-3 text-brand-600" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
