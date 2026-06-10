"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function AdminUsersPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers() });
  const qc = useQueryClient();

  const toggleRole = async (id: string, currentRole: string) => {
    const newRole = currentRole === "superadmin" ? "student" : "superadmin";
    await api.updateUserRole(id, newRole);
    qc.invalidateQueries({ queryKey: ["admin-users"] });
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Kullanıcılar" subtitle="Kullanıcı ve rol yönetimi" />
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="space-y-3">
            {data?.map((u) => (
              <Card key={u.id} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{u.full_name}</p>
                  <p className="text-sm text-zinc-500">@{u.username} — {u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${u.role === "superadmin" ? "bg-amber-100 text-amber-700" : "bg-zinc-100 text-zinc-600"}`}>
                    {u.role}
                  </span>
                  <Button variant="secondary" onClick={() => toggleRole(u.id, u.role)}>
                    {u.role === "superadmin" ? "Öğrenci Yap" : "Admin Yap"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
