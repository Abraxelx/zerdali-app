"use client";

import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

function scoreColor(score: number) {
  if (score >= 9) return "text-green-500";
  if (score >= 6) return "text-amber-500";
  return "text-red-500";
}

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
              <Card key={i} className="animate-fade-in-up">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{s.lessons?.lesson_title}</p>
                    <p className="text-sm text-zinc-500">{s.lessons?.lesson_date && new Date(s.lessons.lesson_date).toLocaleDateString("tr-TR")}</p>
                  </div>
                  <span className={`text-4xl font-extrabold ${scoreColor(s.score)}`}>{s.score}</span>
                </div>
                {s.note && <p className="text-sm text-zinc-500 mt-2 border-t border-zinc-100 pt-2 dark:border-zinc-800">{s.note}</p>}
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
