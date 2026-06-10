"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function ScoresPage() {
  const { data, isLoading } = useQuery({ queryKey: ["scores"], queryFn: api.getScores });

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Notlar" subtitle="Ders başarı notların (1-12)" />
        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(data as { score: number; note?: string; lessons?: { lesson_title: string; lesson_date: string } }[]).map((s, i) => (
              <Card key={i}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.lessons?.lesson_title}</p>
                    <p className="text-sm text-zinc-500">{s.lessons?.lesson_date && new Date(s.lessons.lesson_date).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <span className="text-3xl font-bold text-amber-500">{s.score}</span>
                </div>
                {s.note && <p className="text-sm text-zinc-500 mt-2">{s.note}</p>}
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Henüz not girilmemiş</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
