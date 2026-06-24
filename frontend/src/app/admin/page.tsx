"use client";

import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  ClipboardList,
  Gem,
  GraduationCap,
  LogIn,
  Sparkles,
  UserCircle,
  Users,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StatCard } from "@/components/ui";
import { api } from "@/lib/api";

const quickLinks: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/admin/groups", label: "Grup Yönetimi", icon: Users },
  { href: "/admin/lessons", label: "Ders & Yoklama", icon: BookOpen },
  { href: "/admin/assignments", label: "Ödev Yönetimi", icon: ClipboardList },
  { href: "/admin/gamification", label: "Meblağ & Seviye", icon: Sparkles },
  { href: "/admin/students", label: "Öğrenci Listesi", icon: GraduationCap },
  { href: "/admin/users", label: "Kullanıcılar", icon: UserCircle },
  { href: "/admin/activity", label: "Giriş Kayıtları", icon: LogIn },
  { href: "/admin/points", label: "Puan Ver", icon: Zap },
  { href: "/admin/profile", label: "Öğretmen Profili", icon: UserCircle },
];

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
          {quickLinks.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-lg border border-zinc-200 p-4 text-sm font-medium transition hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <Icon size={18} aria-hidden />
                </span>
                {item.label}
              </Link>
            );
          })}
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
