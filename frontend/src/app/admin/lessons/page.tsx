"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function AdminLessonsPage() {
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: api.getAdminGroups });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers("student") });
  const [groupId, setGroupId] = useState("");
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons", groupId],
    queryFn: () => api.getAdminLessons(groupId || undefined),
    enabled: !!groupId,
  });
  const [form, setForm] = useState({ lesson_title: "", lesson_date: "", notes: "" });
  const [selectedLesson, setSelectedLesson] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const create = async () => {
    if (!groupId) return;
    await api.createLesson({ ...form, group_id: groupId });
    setForm({ lesson_title: "", lesson_date: "", notes: "" });
    qc.invalidateQueries({ queryKey: ["admin-lessons"] });
  };

  const submitAttendance = async () => {
    const records = Object.entries(attendance).map(([student_id, status]) => ({ student_id, status }));
    await api.markAttendance(selectedLesson, records);
    alert("Yoklama kaydedildi");
  };

  const submitScores = async () => {
    const scoreList = Object.entries(scores)
      .filter(([, v]) => v)
      .map(([student_id, score]) => ({ student_id, score: parseInt(score) }));
    await api.setScores(selectedLesson, scoreList);
    alert("Notlar kaydedildi");
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Dersler" subtitle="Ders, yoklama ve not yönetimi" />

        <Card className="mb-6">
          <select className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm mb-4" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Grup seç</option>
            {(groups as { id: string; group_name: string }[] | undefined)?.map((g) => (
              <option key={g.id} value={g.id}>{g.group_name}</option>
            ))}
          </select>

          {groupId && (
            <div className="grid gap-3 sm:grid-cols-4">
              <Input placeholder="Ders başlığı" value={form.lesson_title} onChange={(e) => setForm({ ...form, lesson_title: e.target.value })} />
              <Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} />
              <Input placeholder="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button onClick={create}>Ders Oluştur</Button>
            </div>
          )}
        </Card>

        {isLoading ? <LoadingSpinner /> : lessons && lessons.length > 0 && (
          <>
            <Card className="mb-6">
              <h3 className="font-semibold mb-3">Dersler</h3>
              <div className="space-y-2">
                {(lessons as { id: string; lesson_title: string; lesson_date: string }[]).map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLesson(l.id)}
                    className={`w-full text-left rounded-lg p-3 text-sm ${selectedLesson === l.id ? "bg-amber-50 dark:bg-amber-950 border border-amber-200" : "bg-zinc-50 dark:bg-zinc-800"}`}
                  >
                    {l.lesson_title} — {new Date(l.lesson_date).toLocaleDateString("tr-TR")}
                  </button>
                ))}
              </div>
            </Card>

            {selectedLesson && users && (
              <div className="grid gap-6 lg:grid-cols-2">
                <Card>
                  <h3 className="font-semibold mb-3">Yoklama</h3>
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm">{u.full_name}</span>
                      <select
                        className="rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm"
                        value={attendance[u.id] || ""}
                        onChange={(e) => setAttendance({ ...attendance, [u.id]: e.target.value })}
                      >
                        <option value="">—</option>
                        <option value="present">Katıldı</option>
                        <option value="absent">Katılmadı</option>
                        <option value="late">Geç</option>
                        <option value="excused">Mazeret</option>
                      </select>
                    </div>
                  ))}
                  <Button className="mt-4" onClick={submitAttendance}>Yoklamayı Kaydet</Button>
                </Card>

                <Card>
                  <h3 className="font-semibold mb-3">Notlar (1-12)</h3>
                  {users.map((u) => (
                    <div key={u.id} className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-sm">{u.full_name}</span>
                      <input
                        type="number"
                        min={1}
                        max={12}
                        className="w-16 rounded border border-zinc-300 dark:border-zinc-700 px-2 py-1 text-sm"
                        value={scores[u.id] || ""}
                        onChange={(e) => setScores({ ...scores, [u.id]: e.target.value })}
                      />
                    </div>
                  ))}
                  <Button className="mt-4" onClick={submitScores}>Notları Kaydet</Button>
                </Card>
              </div>
            )}
          </>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
