"use client";

import { useQuery } from "@tanstack/react-query";
import { LogIn, Monitor } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StudentRow } from "@/components/ui";
import { api, LoginLog } from "@/lib/api";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function entryLabel(type: LoginLog["entry_type"]) {
  return type === "login" ? "Giriş yaptı" : "Uygulamaya girdi";
}

function EntryBadge({ type }: { type: LoginLog["entry_type"] }) {
  const isLogin = type === "login";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
        isLogin
          ? "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400"
          : "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400"
      }`}
    >
      {isLogin ? <LogIn size={12} /> : <Monitor size={12} />}
      {entryLabel(type)}
    </span>
  );
}

export default function AdminActivityPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-login-logs"],
    queryFn: () => api.getLoginLogs(),
  });

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader
          title="Giriş Kayıtları"
          subtitle="Kullanıcıların uygulamaya giriş zamanları"
        />
        {isLoading ? (
          <LoadingSpinner />
        ) : !data?.length ? (
          <Card>
            <p className="text-sm text-zinc-500">
              Henüz kayıt yok. Kullanıcılar giriş yaptıkça veya oturum açtıkça burada görünecek.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {data.map((log) => {
              const profile = log.profiles;
              const name = profile?.full_name ?? "Bilinmeyen kullanıcı";
              const subtitle = profile
                ? `@${profile.username} — ${profile.email}${profile.role === "superadmin" ? " · Admin" : ""}`
                : log.user_id;
              return (
                <Card key={log.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <StudentRow
                    name={name}
                    photoUrl={profile?.profile_photo_url}
                    subtitle={subtitle}
                    size={40}
                  />
                  <div className="flex flex-col items-start gap-1 sm:items-end">
                    <EntryBadge type={log.entry_type} />
                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">
                      {formatWhen(log.logged_in_at)}
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
