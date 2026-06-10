"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function AdminAssignmentsPage() {
  const { data: lessons } = useQuery({ queryKey: ["admin-lessons-all"], queryFn: () => api.getAdminLessons() });
  const { data: assignments, isLoading } = useQuery({ queryKey: ["admin-assignments"], queryFn: () => api.getAdminAssignments() });
  const [form, setForm] = useState({ lesson_id: "", title: "", description: "", due_date: "" });
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const { data: submissions } = useQuery({
    queryKey: ["submissions", selectedAssignment],
    queryFn: () => api.getSubmissions(selectedAssignment),
    enabled: !!selectedAssignment,
  });
  const [grades, setGrades] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const create = async () => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    await api.createAssignment(fd);
    setForm({ lesson_id: "", title: "", description: "", due_date: "" });
    qc.invalidateQueries({ queryKey: ["admin-assignments"] });
  };

  const grade = async (submissionId: string) => {
    const score = parseInt(grades[submissionId]);
    if (!score) return;
    await api.gradeSubmission(submissionId, score);
    qc.invalidateQueries({ queryKey: ["submissions"] });
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Ödevler" subtitle="Ödev oluştur ve teslimleri puanla" />

        <Card className="mb-6">
          <h3 className="font-semibold mb-4">Yeni Ödev</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}>
              <option value="">Ders seç</option>
              {(lessons as { id: string; lesson_title: string }[] | undefined)?.map((l) => (
                <option key={l.id} value={l.id}>{l.lesson_title}</option>
              ))}
            </select>
            <Input placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <Input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} />
          </div>
          <Button className="mt-4" onClick={create}>Ödev Oluştur</Button>
        </Card>

        {isLoading ? <LoadingSpinner /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="font-semibold mb-3">Ödevler</h3>
              {(assignments as { id: string; title: string; due_date: string }[] | undefined)?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssignment(a.id)}
                  className={`w-full text-left rounded-lg p-3 text-sm mb-2 ${selectedAssignment === a.id ? "bg-amber-50 dark:bg-amber-950" : "bg-zinc-50 dark:bg-zinc-800"}`}
                >
                  {a.title} — {new Date(a.due_date).toLocaleDateString("tr-TR")}
                </button>
              ))}
            </Card>

            {selectedAssignment && submissions && (
              <Card>
                <h3 className="font-semibold mb-3">Teslimler</h3>
                {(submissions as { id: string; submission_text?: string; profiles?: { full_name: string }; score?: number }[]).map((s) => (
                  <div key={s.id} className="border-b border-zinc-100 dark:border-zinc-800 py-3">
                    <p className="font-medium text-sm">{s.profiles?.full_name}</p>
                    <p className="text-sm text-zinc-500">{s.submission_text}</p>
                    {s.score != null ? (
                      <p className="text-sm text-amber-500 mt-1">Puan: {s.score}</p>
                    ) : (
                      <div className="flex gap-2 mt-2">
                        <input
                          type="number"
                          placeholder="Puan"
                          className="w-20 rounded border px-2 py-1 text-sm"
                          value={grades[s.id] || ""}
                          onChange={(e) => setGrades({ ...grades, [s.id]: e.target.value })}
                        />
                        <Button onClick={() => grade(s.id)}>Puanla</Button>
                      </div>
                    )}
                  </div>
                ))}
              </Card>
            )}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
