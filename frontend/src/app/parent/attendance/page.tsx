"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { ParentProvider, ParentRequireStudent, ParentStudentPicker, useParentStudent } from "@/lib/parent";

const statusLabels: Record<string, string> = {
  present: "Katıldı",
  absent: "Katılmadı",
  late: "Geç",
  excused: "Mazeret",
};

function AttendanceContent() {
  const { selectedId } = useParentStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["parent-attendance", selectedId],
    queryFn: () => api.getParentAttendance(selectedId!) as Promise<{ lesson_title?: string; status?: string; lesson_date?: string }[]>,
    enabled: !!selectedId,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {data?.length ? (
        data.map((row, i) => (
          <Card key={i} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{row.lesson_title ?? "Ders"}</p>
              {row.lesson_date && (
                <p className="text-xs text-zinc-500">{new Date(row.lesson_date).toLocaleDateString("tr-TR")}</p>
              )}
            </div>
            <span className="text-sm font-medium">{statusLabels[row.status ?? ""] ?? row.status ?? "—"}</span>
          </Card>
        ))
      ) : (
        <Card><p className="text-zinc-500 text-sm">Henüz yoklama kaydı yok</p></Card>
      )}
    </div>
  );
}

export default function ParentAttendancePage() {
  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <ParentProvider>
          <PageHeader title="Yoklama" subtitle="Öğrencinin devam durumu" />
          <ParentStudentPicker />
          <ParentRequireStudent><AttendanceContent /></ParentRequireStudent>
        </ParentProvider>
      </AppLayout>
    </AuthGuard>
  );
}
