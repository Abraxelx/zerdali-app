"use client";

import { useQuery } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { ParentProvider, ParentRequireStudent, ParentStudentPicker, useParentStudent } from "@/lib/parent";

type Assignment = {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  submission?: { status: string; is_late?: boolean; score?: number | null } | null;
};

function AssignmentsContent() {
  const { selectedId } = useParentStudent();
  const { data, isLoading } = useQuery({
    queryKey: ["parent-assignments", selectedId],
    queryFn: () => api.getParentAssignments(selectedId!) as Promise<Assignment[]>,
    enabled: !!selectedId,
  });

  if (isLoading) return <LoadingSpinner />;

  return (
    <div className="space-y-4">
      {data?.length ? (
        data.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h3 className="font-semibold">{a.title}</h3>
              {a.submission && <StatusBadge status={a.submission.status} isLate={a.submission.is_late} />}
            </div>
            {a.description && <p className="text-sm text-zinc-500 mt-1">{a.description}</p>}
            <p className="mt-2 inline-flex items-center gap-1 text-xs text-zinc-400">
              <CalendarClock size={14} />
              Son tarih: {new Date(a.due_date).toLocaleDateString("tr-TR")}
            </p>
            {a.submission?.score != null && (
              <p className="mt-2 text-sm text-amber-600">Not: {a.submission.score}</p>
            )}
            {!a.submission && <p className="mt-2 text-sm text-zinc-500">Henüz teslim edilmedi</p>}
          </Card>
        ))
      ) : (
        <Card><p className="text-zinc-500 text-sm">Henüz ödev yok</p></Card>
      )}
    </div>
  );
}

export default function ParentAssignmentsPage() {
  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <ParentProvider>
          <PageHeader title="Ödevler" subtitle="Öğrencinin ödev durumu" />
          <ParentStudentPicker />
          <ParentRequireStudent><AssignmentsContent /></ParentRequireStudent>
        </ParentProvider>
      </AppLayout>
    </AuthGuard>
  );
}
