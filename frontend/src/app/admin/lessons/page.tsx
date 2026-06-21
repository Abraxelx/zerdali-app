"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Users } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader, StudentAvatar, StudentRow } from "@/components/ui";
import { api, GroupMember } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";
import { QUERY_STALE } from "@/lib/query-config";

type Lesson = { id: string; lesson_title: string; lesson_date: string; lesson_time?: string };
type AttendanceRow = { student_id: string; status: string; profiles?: { full_name: string; profile_photo_url?: string | null } };
type ScoreRow = { student_id: string; score: number; profiles?: { full_name: string; profile_photo_url?: string | null } };

const statusLabels: Record<string, string> = {
  present: "Katıldı",
  absent: "Katılmadı",
  late: "Geç",
  excused: "Mazeret",
};

function formatLessonWhen(lesson: Lesson) {
  const date = new Date(lesson.lesson_date).toLocaleDateString("tr-TR");
  return lesson.lesson_time ? `${date} · ${lesson.lesson_time}` : date;
}

export default function AdminLessonsPage() {
  const msg = useMessage();
  const { data: groups } = useQuery({ queryKey: ["admin-groups"], queryFn: api.getAdminGroups });
  const [groupId, setGroupId] = useState("");
  const { data: members } = useQuery({
    queryKey: ["group-members", groupId],
    queryFn: () => api.getGroupMembers(groupId),
    enabled: !!groupId,
    staleTime: QUERY_STALE.groupMembers,
  });
  const { data: lessons, isLoading } = useQuery({
    queryKey: ["admin-lessons", groupId],
    queryFn: () => api.getAdminLessons(groupId || undefined) as Promise<Lesson[]>,
    enabled: !!groupId,
  });
  const [form, setForm] = useState({ lesson_title: "", lesson_date: "", lesson_time: "", notes: "" });
  const [selectedLesson, setSelectedLesson] = useState("");
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [scores, setScores] = useState<Record<string, string>>({});
  const qc = useQueryClient();

  const { data: savedAttendance, isLoading: loadingAttendance } = useQuery({
    queryKey: ["lesson-attendance", selectedLesson],
    queryFn: () => api.getAdminLessonAttendance(selectedLesson) as Promise<AttendanceRow[]>,
    enabled: !!selectedLesson,
  });
  const { data: savedScores, isLoading: loadingScores } = useQuery({
    queryKey: ["lesson-scores", selectedLesson],
    queryFn: () => api.getAdminLessonScores(selectedLesson) as Promise<ScoreRow[]>,
    enabled: !!selectedLesson,
  });

  const students = useMemo(
    () =>
      (members as GroupMember[] | undefined)
        ?.map((m) => m.profiles)
        .filter((p): p is NonNullable<typeof p> => !!p) ?? [],
    [members]
  );

  useEffect(() => {
    if (!savedAttendance) return;
    const next: Record<string, string> = {};
    savedAttendance.forEach((row) => {
      next[row.student_id] = row.status;
    });
    setAttendance(next);
  }, [savedAttendance]);

  useEffect(() => {
    if (!savedScores) return;
    const next: Record<string, string> = {};
    savedScores.forEach((row) => {
      next[row.student_id] = String(row.score);
    });
    setScores(next);
  }, [savedScores]);

  const create = async () => {
    if (!groupId || !form.lesson_title || !form.lesson_date) {
      msg.error("Eksik bilgi", "Grup, ders adı ve tarih zorunlu.");
      return;
    }
    try {
      await api.createLesson({
        ...form,
        group_id: groupId,
        ...(form.lesson_time ? { lesson_time: form.lesson_time } : {}),
      });
      setForm({ lesson_title: "", lesson_date: "", lesson_time: "", notes: "" });
      qc.invalidateQueries({ queryKey: ["admin-lessons"] });
      msg.success("Ders oluşturuldu");
    } catch (e) {
      showApiError(msg, e, "Ders oluşturulamadı");
    }
  };

  const submitAttendance = async () => {
    const records = Object.entries(attendance)
      .filter(([, status]) => status)
      .map(([student_id, status]) => ({ student_id, status }));
    if (!records.length) {
      msg.error("Yoklama kaydedilemedi", "En az bir öğrenci için durum seç.");
      return;
    }
    try {
      await api.markAttendance(selectedLesson, records);
      qc.invalidateQueries({ queryKey: ["lesson-attendance", selectedLesson] });
      msg.success("Yoklama kaydedildi");
    } catch (e) {
      showApiError(msg, e, "Yoklama kaydedilemedi");
    }
  };

  const submitScores = async () => {
    const scoreList = Object.entries(scores)
      .filter(([, v]) => v)
      .map(([student_id, score]) => ({ student_id, score: parseInt(score) }));
    try {
      await api.setScores(selectedLesson, scoreList);
      qc.invalidateQueries({ queryKey: ["lesson-scores", selectedLesson] });
      msg.success("Notlar kaydedildi");
    } catch (e) {
      showApiError(msg, e, "Notlar kaydedilemedi");
    }
  };

  const attendanceSummary = savedAttendance?.length ?? 0;

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Dersler" subtitle="Ders, yoklama ve not yönetimi" />

        <Card className="mb-6">
          <select
            className="w-full rounded-lg border border-zinc-300/70 bg-white/70 px-3 py-2 text-sm mb-4 dark:border-zinc-700/70 dark:bg-zinc-900/50"
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setSelectedLesson("");
            }}
          >
            <option value="">Grup seç</option>
            {(groups as { id: string; group_name: string }[] | undefined)?.map((g) => (
              <option key={g.id} value={g.id}>{g.group_name}</option>
            ))}
          </select>

          {groupId && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <Input placeholder="Ders başlığı" value={form.lesson_title} onChange={(e) => setForm({ ...form, lesson_title: e.target.value })} />
              <Input type="date" value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} />
              <Input type="time" label="Başlangıç saati" value={form.lesson_time} onChange={(e) => setForm({ ...form, lesson_time: e.target.value })} />
              <Input placeholder="Notlar" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              <Button onClick={create} className="self-end">Ders Oluştur</Button>
            </div>
          )}
        </Card>

        {isLoading ? (
          <LoadingSpinner />
        ) : lessons && lessons.length > 0 ? (
          <>
            <Card className="mb-6">
              <h3 className="font-semibold mb-3">Dersler</h3>
              <div className="space-y-2">
                {lessons.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setSelectedLesson(l.id)}
                    className={`w-full text-left rounded-lg p-3 text-sm transition ${selectedLesson === l.id ? "bg-amber-500/15 border border-amber-300/50" : "bg-zinc-500/5 hover:bg-zinc-500/10"}`}
                  >
                    <span className="font-medium">{l.lesson_title}</span>
                    <span className="text-zinc-500"> — {formatLessonWhen(l)}</span>
                  </button>
                ))}
              </div>
            </Card>

            {selectedLesson && students.length > 0 && (
              <>
                {savedAttendance && savedAttendance.length > 0 && (
                  <Card className="mb-4">
                    <h3 className="font-semibold mb-2 flex items-center gap-2 text-sm">
                      <CheckCircle2 size={16} className="text-green-500" />
                      Kayıtlı yoklama ({attendanceSummary}/{students.length})
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {savedAttendance.map((row) => (
                        <span key={row.student_id} className="inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 pl-1 pr-2.5 py-1 text-xs">
                          <StudentAvatar name={row.profiles?.full_name ?? "?"} photoUrl={row.profiles?.profile_photo_url} size={20} />
                          {row.profiles?.full_name ?? "?"}: {statusLabels[row.status] ?? row.status}
                        </span>
                      ))}
                    </div>
                  </Card>
                )}

                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <h3 className="font-semibold mb-1 flex items-center gap-2">
                      <Users size={16} /> Yoklama
                    </h3>
                    <p className="text-xs text-zinc-500 mb-3">Grup öğrencileri ({students.length})</p>
                    {loadingAttendance ? (
                      <LoadingSpinner />
                    ) : (
                      students.map((u) => (
                        <div key={u.id} className="flex items-center justify-between py-2 border-b border-zinc-500/10 gap-2">
                          <StudentRow name={u.full_name} photoUrl={u.profile_photo_url} size={28} />
                          <select
                            className="rounded border border-zinc-300/70 bg-white/70 px-2 py-1 text-sm dark:border-zinc-700/70 dark:bg-zinc-900/50"
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
                      ))
                    )}
                    <Button className="mt-4" onClick={submitAttendance}>Yoklamayı Kaydet</Button>
                  </Card>

                  <Card>
                    <h3 className="font-semibold mb-3">Notlar (1-12)</h3>
                    {loadingScores ? (
                      <LoadingSpinner />
                    ) : (
                      students.map((u) => (
                        <div key={u.id} className="flex items-center justify-between py-2 border-b border-zinc-500/10 gap-2">
                          <StudentRow name={u.full_name} photoUrl={u.profile_photo_url} size={28} />
                          <input
                            type="number"
                            min={1}
                            max={12}
                            className="w-16 rounded border border-zinc-300/70 bg-white/70 px-2 py-1 text-sm dark:border-zinc-700/70 dark:bg-zinc-900/50"
                            value={scores[u.id] || ""}
                            onChange={(e) => setScores({ ...scores, [u.id]: e.target.value })}
                          />
                        </div>
                      ))
                    )}
                    <Button className="mt-4" onClick={submitScores}>Notları Kaydet</Button>
                  </Card>
                </div>
              </>
            )}

            {selectedLesson && students.length === 0 && (
              <Card><p className="text-zinc-500 text-sm">Bu grupta henüz öğrenci yok. Önce gruba öğrenci ekle.</p></Card>
            )}
          </>
        ) : groupId ? (
          <Card><p className="text-zinc-500">Bu grupta henüz ders yok</p></Card>
        ) : null}
      </AppLayout>
    </AuthGuard>
  );
}
