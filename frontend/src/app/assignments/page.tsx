"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function AssignmentsPage() {
  const { data, isLoading } = useQuery({ queryKey: ["assignments"], queryFn: api.getAssignments });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const handleSubmit = async (id: string) => {
    const form = new FormData();
    if (text[id]) form.append("submission_text", text[id]);
    setSubmitting(id);
    try {
      await api.submitAssignment(id, form);
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setText({ ...text, [id]: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Teslim başarısız");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Ödevler" subtitle="Ödevlerini görüntüle ve teslim et" />
        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.length > 0 ? (
          <div className="space-y-4">
            {(data as { id: string; title: string; description?: string; due_date: string; file_url?: string }[]).map((a) => (
              <Card key={a.id}>
                <h3 className="font-semibold">{a.title}</h3>
                {a.description && <p className="text-sm text-zinc-500 mt-1">{a.description}</p>}
                <p className="text-xs text-zinc-400 mt-1">Son tarih: {new Date(a.due_date).toLocaleDateString("tr-TR")}</p>
                {a.file_url && (
                  <a href={a.file_url} target="_blank" rel="noopener" className="text-sm text-amber-500 hover:underline mt-2 inline-block">
                    Dosyayı indir
                  </a>
                )}
                <div className="mt-4 space-y-2">
                  <textarea
                    className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                    placeholder="Teslim metni..."
                    rows={3}
                    value={text[a.id] || ""}
                    onChange={(e) => setText({ ...text, [a.id]: e.target.value })}
                  />
                  <Button onClick={() => handleSubmit(a.id)} disabled={submitting === a.id}>
                    {submitting === a.id ? "Gönderiliyor..." : "Teslim Et"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Henüz ödev yok</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
