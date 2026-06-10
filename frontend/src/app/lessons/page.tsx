"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function LessonsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["lessons"], queryFn: api.getLessons });

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Dersler" subtitle="Grubundaki dersler" />
        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {(data as { id: string; lesson_title: string; lesson_date: string; notes?: string }[]).map((lesson) => (
              <Card key={lesson.id}>
                <h3 className="font-semibold">{lesson.lesson_title}</h3>
                <p className="text-sm text-zinc-500 mt-1">{new Date(lesson.lesson_date).toLocaleDateString("tr-TR")}</p>
                {lesson.notes && <p className="text-sm mt-2 text-zinc-600">{lesson.notes}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Henüz ders yok</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
