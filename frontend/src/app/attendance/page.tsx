"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, ShieldCheck, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

const statusConfig: Record<string, { label: string; cls: string; Icon: LucideIcon }> = {
  present: { label: "Katıldı", cls: "text-green-700 bg-green-100 dark:bg-green-950 dark:text-green-400", Icon: CheckCircle2 },
  absent: { label: "Katılmadı", cls: "text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-400", Icon: XCircle },
  late: { label: "Geç kaldı", cls: "text-amber-700 bg-amber-100 dark:bg-amber-950 dark:text-amber-400", Icon: Clock },
  excused: { label: "Mazeretli", cls: "text-blue-700 bg-blue-100 dark:bg-blue-950 dark:text-blue-400", Icon: ShieldCheck },
};

export default function AttendancePage() {
  const { data, isLoading } = useQuery({ queryKey: ["attendance"], queryFn: api.getAttendance });

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Yoklama" subtitle="Yoklama geçmişin" />
        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.length > 0 ? (
          <div className="space-y-3">
            {(data as { status: string; lessons?: { lesson_title: string; lesson_date: string } }[]).map((a, i) => {
              const c = statusConfig[a.status] || statusConfig.absent;
              return (
                <Card key={i} className="flex items-center justify-between animate-fade-in-up">
                  <div>
                    <p className="font-medium">{a.lessons?.lesson_title}</p>
                    <p className="text-sm text-zinc-500">{a.lessons?.lesson_date && new Date(a.lessons.lesson_date).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${c.cls}`}>
                    <c.Icon size={15} /> {c.label}
                  </span>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Yoklama kaydı yok</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
