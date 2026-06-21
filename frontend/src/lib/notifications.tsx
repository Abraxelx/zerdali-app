"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { api } from "./api";
import { useAuth } from "./auth";

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
};

type NotificationContextType = {
  unreadCount: number;
  dismissToast: (id: string) => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider");
  return ctx;
}

function playNotificationSound() {
  try {
    const audio = new Audio("/sounds/yay.mp3");
    audio.volume = 0.7;
    void audio.play();
  } catch {
    /* sessiz geç */
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.getNotifications() as Promise<AppNotification[]>,
    enabled: !!user,
    refetchInterval: 8000,
  });

  useEffect(() => {
    if (!notifications || !user) return;

    if (!initialized.current) {
      notifications.forEach((n) => seenIds.current.add(n.id));
      initialized.current = true;
      return;
    }

    const fresh = notifications.filter((n) => !seenIds.current.has(n.id) && !n.read);
    if (fresh.length === 0) return;

    fresh.forEach((n) => seenIds.current.add(n.id));
    setToasts((prev) => [...fresh, ...prev].slice(0, 5));
    playNotificationSound();
  }, [notifications, user]);

  const dismissToast = useCallback(
    async (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      try {
        await api.markNotificationRead(id);
        qc.invalidateQueries({ queryKey: ["notifications"] });
      } catch {
        /* ok */
      }
    },
    [qc]
  );

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;

  return (
    <NotificationContext.Provider value={{ unreadCount, dismissToast }}>
      {children}
      {user && toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
          {toasts.map((t) => (
            <div
              key={t.id}
              className="glass-strong animate-fade-in-up flex items-start gap-3 rounded-2xl p-4 shadow-lg border border-amber-200/50 dark:border-amber-800/30"
            >
              <div className="rounded-full bg-amber-100 p-2 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                <Bell size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{t.title}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{t.message}</p>
              </div>
              <button
                onClick={() => dismissToast(t.id)}
                className="shrink-0 rounded p-1 text-zinc-400 hover:text-zinc-600"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </NotificationContext.Provider>
  );
}
