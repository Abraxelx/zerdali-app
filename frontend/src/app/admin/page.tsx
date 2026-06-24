"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, Gem, Zap } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";

function AdminDashboard() {
  const { data: users, isLoading } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers() });
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: api.getAdminGroups });
  const { data: meblahTypes } = useQuery({ queryKey: ["meblah-types"], queryFn: api.getMeblahTypes });
  const { data: levels } = useQuery({ queryKey: ["levels"], queryFn: api.getLevels });

  if (isLoading) return <LoadingSpinner />;

  const students = users?.filter((u) => u.role === "student").length ?? 0;

  return (
    <>
      <PageHeader title="Admin Panel" subtitle="Zerdali yönetim merkezi" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={Users} label="Öğrenciler" value={students} color="blue" />
        <StatCard icon={BookOpen} label="Gruplar" value={groups?.length ?? 0} color="green" />
        <StatCard icon={Gem} label="Meblağ Tipleri" value={meblahTypes?.length ?? 0} color="purple" />
        <StatCard icon={Zap} label="Seviyeler" value={levels?.length ?? 0} color="amber" />
      </div>
      <Card>
        <h2 className="font-semibold mb-4">Hızlı Erişim</h2>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[
            { href: "/admin/groups", label: "Grup Yönetimi" },
            { href: "/admin/lessons", label: "Ders & Yoklama" },
            { href: "/admin/assignments", label: "Ödev Yönetimi" },
            { href: "/admin/gamification", label: "Meblağ & Seviye" },
            { href: "/admin/users", label: "Kullanıcılar" },
            { href: "/admin/activity", label: "Giriş Kayıtları" },
            { href: "/admin/points", label: "Puan Ver" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="rounded-lg border border-zinc-200 dark:border-zinc-700 p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-sm font-medium">
              {item.label}
            </a>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function AdminPage() {
  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <AdminDashboard />
      </AppLayout>
    </AuthGuard>
  );
}
