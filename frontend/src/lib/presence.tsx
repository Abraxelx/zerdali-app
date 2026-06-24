"use client";

import { useQuery } from "@tanstack/react-query";
import { Circle, Users, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { StudentAvatar } from "@/components/ui";
import { api, OnlineUser, Profile } from "./api";
import { useAuth } from "./auth";

const HEARTBEAT_MS = 60_000;

type PresenceContextType = {
  onlineCount: number;
  panelOpen: boolean;
  togglePanel: () => void;
  closePanel: () => void;
};

const PresenceContext = createContext<PresenceContextType | null>(null);

function roleLabel(role: Profile["role"]) {
  if (role === "superadmin") return "Öğretmen";
  if (role === "veli") return "Veli";
  return "Öğrenci";
}

function roleOrder(role: Profile["role"]) {
  if (role === "superadmin") return 0;
  if (role === "veli") return 1;
  return 2;
}

function sortOnlineUsers(users: OnlineUser[], currentUserId?: string) {
  return [...users].sort((a, b) => {
    if (currentUserId) {
      if (a.id === currentUserId) return -1;
      if (b.id === currentUserId) return 1;
    }
    const roleDiff = roleOrder(a.role) - roleOrder(b.role);
    if (roleDiff !== 0) return roleDiff;
    return a.full_name.localeCompare(b.full_name, "tr");
  });
}

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [panelOpen, setPanelOpen] = useState(false);

  const { data: onlineUsers } = useQuery({
    queryKey: ["online-users"],
    queryFn: api.getOnlineUsers,
    enabled: !!user,
    refetchInterval: panelOpen ? 15_000 : 30_000,
  });

  const sendHeartbeat = useCallback(async () => {
    if (!user) return;
    try {
      await api.presenceHeartbeat();
    } catch {
      /* sessiz */
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void sendHeartbeat();
    const timer = window.setInterval(() => void sendHeartbeat(), HEARTBEAT_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void sendHeartbeat();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [user, sendHeartbeat]);

  const sorted = useMemo(
    () => sortOnlineUsers(onlineUsers ?? [], user?.id),
    [onlineUsers, user?.id]
  );

  const togglePanel = () => setPanelOpen((v) => !v);
  const closePanel = () => setPanelOpen(false);

  return (
    <PresenceContext.Provider
      value={{ onlineCount: sorted.length, panelOpen, togglePanel, closePanel }}
    >
      {children}

      {user && panelOpen && (
        <>
          <button className="fixed inset-0 z-[90] bg-black/20" aria-label="Kapat" onClick={closePanel} />
          <div className="fixed inset-x-3 top-16 z-[95] mx-auto w-full max-w-sm glass-strong rounded-2xl shadow-xl border border-white/40 dark:border-white/10 overflow-hidden sm:inset-x-auto sm:right-4 sm:mx-0">
            <div className="flex items-center justify-between border-b border-zinc-500/10 px-4 py-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
                </span>
                Çevrimiçi ({sorted.length})
              </h3>
              <button onClick={closePanel} className="rounded p-1 text-zinc-400 hover:text-zinc-600">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto">
              {sorted.length === 0 ? (
                <p className="p-4 text-sm text-zinc-500 text-center">Şu an çevrimiçi kimse yok</p>
              ) : (
                sorted.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 border-b border-zinc-500/10 px-4 py-3 last:border-0"
                  >
                    <div className="relative shrink-0">
                      <StudentAvatar name={u.full_name} photoUrl={u.profile_photo_url} size={36} />
                      <Circle
                        size={10}
                        className="absolute -bottom-0.5 -right-0.5 fill-green-500 text-green-500"
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">
                        {u.full_name}
                        {u.id === user.id && (
                          <span className="ml-1 text-xs font-normal text-zinc-400">(sen)</span>
                        )}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {roleLabel(u.role)} · @{u.username}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <p className="border-t border-zinc-500/10 px-4 py-2 text-[10px] text-zinc-400">
              Son 1 dakikada aktif olanlar gösterilir
            </p>
          </div>
        </>
      )}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  const ctx = useContext(PresenceContext);
  if (!ctx) throw new Error("usePresence must be used within PresenceProvider");
  return ctx;
}

export function OnlineUsersBell() {
  const { onlineCount, togglePanel } = usePresence();
  return (
    <button
      type="button"
      onClick={togglePanel}
      className="relative rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-500/10 hover:text-green-600"
      title="Çevrimiçi kullanıcılar"
      aria-label={`Çevrimiçi kullanıcılar${onlineCount > 0 ? `, ${onlineCount} kişi` : ""}`}
    >
      <Users size={20} />
      {onlineCount > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 px-1 text-[10px] font-bold text-white">
          {onlineCount > 99 ? "99+" : onlineCount}
        </span>
      )}
    </button>
  );
}
