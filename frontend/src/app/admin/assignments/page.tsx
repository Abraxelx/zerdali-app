"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, Paperclip } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";

type Submission = {
  id: string;
  submission_text?: string;
  status?: string;
  score?: number | null;
  is_late?: boolean;
  profiles?: { full_name: string };
};

export default function AdminAssignmentsPage() {
  const { data: lessons } = useQuery({ queryKey: ["admin-lessons-all"], queryFn: () => api.getAdminLessons() });
  const { data: assignments, isLoading } = useQuery({ queryKey: ["admin-assignments"], queryFn: () => api.getAdminAssignments() });
  const [form, setForm] = useState({ lesson_id: "", title: "", description: "" });
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState("");
  const { data: submissions } = useQuery({
    queryKey: ["submissions", selectedAssignment],
    queryFn: () => api.getSubmissions(selectedAssignment) as Promise<Submission[]>,
    enabled: !!selectedAssignment,
  });
  const qc = useQueryClient();

  const create = async () => {
    if (!form.lesson_id || !form.title) {
      alert("Ders ve başlık zorunlu");
      return;
    }
    setCreating(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append("file", file);
      await api.createAssignment(fd);
      setForm({ lesson_id: "", title: "", description: "" });
      setFile(null);
      qc.invalidateQueries({ queryKey: ["admin-assignments"] });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Oluşturulamadı");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Ödevler" subtitle="Ödev oluştur — teslimleri 'Ödev Onay' sayfasından puanla" />

        <Card className="mb-6">
          <h3 className="font-semibold mb-1">Yeni Ödev</h3>
          <p className="mb-4 inline-flex items-center gap-1 text-xs text-amber-600">
            <CalendarClock size={14} /> Süre otomatik: oluşturma anından itibaren 1 hafta
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm dark:bg-zinc-800" value={form.lesson_id} onChange={(e) => setForm({ ...form, lesson_id: e.target.value })}>
              <option value="">Ders seç</option>
              {(lessons as { id: string; lesson_title: string }[] | undefined)?.map((l) => (
                <option key={l.id} value={l.id}>{l.lesson_title}</option>
              ))}
            </select>
            <Input placeholder="Başlık" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            <Input placeholder="Açıklama" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-400">
              <Paperclip size={15} />
              <span className="truncate">{file?.name ?? "Ödev dosyası ekle (opsiyonel)"}</span>
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <Button className="mt-4" onClick={create} disabled={creating}>{creating ? "Oluşturuluyor..." : "Ödev Oluştur"}</Button>
        </Card>

        {isLoading ? <LoadingSpinner /> : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="font-semibold mb-3">Ödevler</h3>
              {(assignments as { id: string; title: string; due_date: string }[] | undefined)?.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedAssignment(a.id)}
                  className={`w-full text-left rounded-lg p-3 text-sm mb-2 transition ${selectedAssignment === a.id ? "bg-amber-50 dark:bg-amber-950" : "bg-zinc-50 hover:bg-zinc-100 dark:bg-zinc-800 dark:hover:bg-zinc-700"}`}
                >
                  {a.title} — {new Date(a.due_date).toLocaleDateString("tr-TR")}
                </button>
              ))}
            </Card>

            {selectedAssignment && submissions && (
              <Card>
                <h3 className="font-semibold mb-3">Teslimler</h3>
                {submissions.length === 0 ? (
                  <p className="text-sm text-zinc-500">Henüz teslim yok</p>
                ) : (
                  submissions.map((s) => (
                    <div key={s.id} className="border-b border-zinc-100 dark:border-zinc-800 py-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium text-sm">{s.profiles?.full_name}</p>
                        <StatusBadge status={s.status ?? "pending"} isLate={s.is_late} />
                      </div>
                      <p className="text-sm text-zinc-500 mt-1">{s.submission_text}</p>
                      {s.score != null && <p className="text-sm text-amber-500 mt-1">Puan: {s.score}</p>}
                    </div>
                  ))
                )}
                <p className="mt-3 text-xs text-zinc-400">Onay ve puanlama için &quot;Ödev Onay&quot; sayfasını kullan.</p>
              </Card>
            )}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
