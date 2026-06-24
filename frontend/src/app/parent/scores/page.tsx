"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { ParentProvider, ParentRequireStudent, ParentStudentPicker, useParentStudent } from "@/lib/parent";

function ScoresContent() {
  const { selectedId } = useParentStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["parent-scores", selectedId],
    queryFn: () => api.getParentScores(selectedId!) as Promise<{ lesson_title?: string; score?: number; lesson_date?: string }[]>,
    enabled: !!selectedId,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-3">
      {data?.length ? (
        data.map((s, i) => (
          <Card key={i} className="flex items-center justify-between">
            <div>
              <p className="font-medium">{s.lesson_title ?? "Ders"}</p>
              {s.lesson_date && (
                <p className="text-xs text-zinc-500">{new Date(s.lesson_date).toLocaleDateString("tr-TR")}</p>
              )}
            </div>
            <span className="text-lg font-bold text-amber-600">{s.score ?? "—"}</span>
          </Card>
        ))
      ) : (
        <Card><p className="text-zinc-500 text-sm">Henüz not kaydı yok</p></Card>
      )}
    </div>
  );
}

export default function ParentScoresPage() {
  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <ParentProvider>
          <PageHeader title="Notlar" subtitle="Öğrencinin ders notları" />
          <ParentStudentPicker />
          <ParentRequireStudent><ScoresContent /></ParentRequireStudent>
        </ParentProvider>
      </AppLayout>
    </AuthGuard>
  );
}
