"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

const statusLabels: Record<string, string> = {
  present: "Katıldı",
  absent: "Katılmadı",
  late: "Geç kaldı",
  excused: "Mazeretli",
};

const statusColors: Record<string, string> = {
  present: "text-green-600 bg-green-50",
  absent: "text-red-600 bg-red-50",
  late: "text-amber-600 bg-amber-50",
  excused: "text-blue-600 bg-blue-50",
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
            {(data as { status: string; lessons?: { lesson_title: string; lesson_date: string } }[]).map((a, i) => (
              <Card key={i} className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{a.lessons?.lesson_title}</p>
                  <p className="text-sm text-zinc-500">{a.lessons?.lesson_date && new Date(a.lessons.lesson_date).toLocaleDateString("tr-TR")}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-sm font-medium ${statusColors[a.status] || ""}`}>
                  {statusLabels[a.status] || a.status}
                </span>
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Yoklama kaydı yok</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
