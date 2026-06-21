"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, X } from "lucide-react";
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
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
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
    /* sessiz */
  }
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "";
  }
}

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const seenIds = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  const [toasts, setToasts] = useState<AppNotification[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: notifications } = useQuery({
    queryKey: ["notifications", user?.id],
    queryFn: () => api.getNotifications() as Promise<AppNotification[]>,
    enabled: !!user,
    refetchInterval: panelOpen ? 5000 : 8000,
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

  const markRead = useCallback(
    async (id: string) => {
      await api.markNotificationRead(id);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    [qc]
  );

  const markAllRead = useCallback(async () => {
    await api.markAllNotificationsRead();
    qc.invalidateQueries({ queryKey: ["notifications"] });
  }, [qc]);

  const dismissToast = useCallback(
    async (id: string) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
      await markRead(id);
    },
    [markRead]
  );

  const togglePanel = useCallback(() => setPanelOpen((o) => !o), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  const unreadCount = notifications?.filter((n) => !n.read).length ?? 0;
  const list = notifications ?? [];

  return (
    <NotificationContext.Provider
      value={{ unreadCount, panelOpen, togglePanel, closePanel, markRead, markAllRead, dismissToast }}
    >
      {children}

      {/* Anlık toast'lar */}
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

      {/* Geçmiş paneli */}
      {user && panelOpen && (
        <>
          <button className="fixed inset-0 z-[90] bg-black/20" aria-label="Kapat" onClick={closePanel} />
          <div className="fixed right-4 top-16 z-[95] w-full max-w-sm glass-strong rounded-2xl shadow-xl border border-white/40 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-500/10 px-4 py-3">
              <h3 className="font-semibold text-sm">Bildirimler</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead()}
                    className="rounded-lg px-2 py-1 text-xs text-amber-600 hover:bg-amber-500/10 flex items-center gap-1"
                    title="Tümünü okundu işaretle"
                  >
                    <CheckCheck size={14} /> Tümü
                  </button>
                )}
                <button onClick={closePanel} className="rounded p-1 text-zinc-400 hover:text-zinc-600">
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {list.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500 text-center">Henüz bildirim yok</p>
              ) : (
                list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => {
                      if (!n.read) markRead(n.id);
                    }}
                    className={`w-full text-left px-4 py-3 border-b border-zinc-500/10 transition hover:bg-zinc-500/5 ${
                      !n.read ? "bg-amber-500/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />}
                      <div className={!n.read ? "" : "pl-4"}>
                        <p className="text-sm font-medium">{n.title}</p>
                        <p className="text-xs text-zinc-500 mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-zinc-400 mt-1">{formatWhen(n.created_at)}</p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </NotificationContext.Provider>
  );
}

export function NotificationBell() {
  const { unreadCount, togglePanel } = useNotifications();
  return (
    <button
      type="button"
      onClick={togglePanel}
      className="relative rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-500/10 hover:text-amber-500"
      title="Bildirimler"
      aria-label="Bildirimler"
    >
      <Bell size={18} />
      {unreadCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
}
