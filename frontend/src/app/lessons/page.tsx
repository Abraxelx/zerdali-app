"use client";

import { useQuery } from "@tanstack/react-query";
import { BookOpen, CalendarDays } from "lucide-react";
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data as { id: string; lesson_title: string; lesson_date: string; notes?: string }[]).map((lesson) => (
              <Card key={lesson.id} className="animate-fade-in-up">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{lesson.lesson_title}</h3>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-xs text-zinc-400">
                      <CalendarDays size={13} />
                      {new Date(lesson.lesson_date).toLocaleDateString("tr-TR")}
                    </p>
                    {lesson.notes && <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{lesson.notes}</p>}
                  </div>
                </div>
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
