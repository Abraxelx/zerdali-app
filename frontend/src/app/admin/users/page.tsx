"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StudentRow } from "@/components/ui";
import { api, Profile } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

const ROLES: { value: Profile["role"]; label: string }[] = [
  { value: "student", label: "Öğrenci" },
  { value: "veli", label: "Veli" },
  { value: "superadmin", label: "Admin" },
];

function roleBadgeClass(role: string) {
  if (role === "superadmin") return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300";
  if (role === "veli") return "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function roleLabel(role: string) {
  return ROLES.find((r) => r.value === role)?.label ?? role;
}

export default function AdminUsersPage() {
  const msg = useMessage();
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers() });
  const qc = useQueryClient();

  const changeRole = async (id: string, role: Profile["role"]) => {
    try {
      await api.updateUserRole(id, role);
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      msg.success("Rol güncellendi");
    } catch (e) {
      showApiError(msg, e, "Rol güncellenemedi");
    }
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader
          title="Kullanıcılar"
          subtitle="Kayıt olan herkes öğrenci başlar — veli veya admin rolünü buradan ata"
        />
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {data?.map((u) => (
              <Card key={u.id} className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <StudentRow
                  name={u.full_name}
                  photoUrl={u.profile_photo_url}
                  subtitle={`@${u.username} — ${u.email}`}
                  size={40}
                />
                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${roleBadgeClass(u.role)}`}>
                    {roleLabel(u.role)}
                  </span>
                  <select
                    className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    value={u.role}
                    onChange={(e) => changeRole(u.id, e.target.value as Profile["role"])}
                  >
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
