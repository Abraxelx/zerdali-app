"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader } from "@/components/ui";
import { api, GroupMember } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

const DAYS = [
  { value: "1", label: "Pazartesi" },
  { value: "2", label: "Salı" },
  { value: "3", label: "Çarşamba" },
  { value: "4", label: "Perşembe" },
  { value: "5", label: "Cuma" },
  { value: "6", label: "Cumartesi" },
  { value: "0", label: "Pazar" },
];

const DAY_LABELS: Record<number, string> = {
  0: "Pazar",
  1: "Pazartesi",
  2: "Salı",
  3: "Çarşamba",
  4: "Perşembe",
  5: "Cuma",
  6: "Cumartesi",
};

function formatHour(hour: number | string) {
  if (typeof hour === "string" && hour.includes(":")) {
    const [h, m] = hour.split(":");
    return `${h.padStart(2, "0")}:${m.padStart(2, "0")}`;
  }
  const h = typeof hour === "string" ? parseInt(hour, 10) : hour;
  return `${String(h).padStart(2, "0")}:00`;
}

type Group = {
  id: string;
  group_name: string;
  lesson_day: number;
  lesson_hour: number | string;
  is_active: boolean;
};

function GroupCard({ group }: { group: Group }) {
  const msg = useMessage();
  const qc = useQueryClient();
  const { data: members, isLoading } = useQuery({
    queryKey: ["group-members", group.id],
    queryFn: () => api.getGroupMembers(group.id),
  });

  const removeMember = async (studentId: string) => {
    try {
      await api.removeMember(group.id, studentId);
      qc.invalidateQueries({ queryKey: ["group-members", group.id] });
      msg.success("Öğrenci gruptan çıkarıldı");
    } catch (e) {
      showApiError(msg, e, "Öğrenci çıkarılamadı");
    }
  };

  return (
    <Card>
      <h3 className="font-semibold">{group.group_name}</h3>
      <p className="text-sm text-zinc-500">
        {DAY_LABELS[group.lesson_day] ?? group.lesson_day} — {formatHour(group.lesson_hour)}
      </p>
      <p className="text-xs text-zinc-400 mt-1 mb-4">{group.is_active ? "Aktif" : "Pasif"}</p>

      <div className="border-t border-zinc-100 dark:border-zinc-800 pt-3">
        <p className="text-xs font-medium text-zinc-500 uppercase tracking-wide mb-2">
          Öğrenciler ({members?.length ?? 0})
        </p>
        {isLoading ? (
          <p className="text-sm text-zinc-400">Yükleniyor...</p>
        ) : members && members.length > 0 ? (
          <ul className="space-y-2">
            {members.map((m: GroupMember) => (
              <li
                key={m.student_id}
                className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800/50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">{m.profiles?.full_name ?? "Bilinmeyen"}</p>
                  <p className="text-xs text-zinc-500">@{m.profiles?.username ?? m.student_id.slice(0, 8)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeMember(m.student_id)}
                  className="text-xs text-red-500 hover:text-red-600"
                >
                  Çıkar
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-zinc-400">Henüz öğrenci yok</p>
        )}
      </div>
    </Card>
  );
}

export default function AdminGroupsPage() {
  const msg = useMessage();
  const { data, isLoading } = useQuery({ queryKey: ["admin-groups"], queryFn: api.getAdminGroups });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers("student") });
  const [form, setForm] = useState({ group_name: "", lesson_day: "", lesson_hour: "14:00" });
  const [memberGroup, setMemberGroup] = useState("");
  const [memberStudent, setMemberStudent] = useState("");
  const qc = useQueryClient();

  const create = async () => {
    try {
      await api.createGroup(form);
      setForm({ group_name: "", lesson_day: "", lesson_hour: "14:00" });
      qc.invalidateQueries({ queryKey: ["admin-groups"] });
      msg.success("Grup oluşturuldu");
    } catch (err) {
      showApiError(msg, err, "Grup oluşturulamadı");
    }
  };

  const addMember = async () => {
    if (!memberGroup || !memberStudent) {
      msg.error("Eksik bilgi", "Grup ve öğrenci seç.");
      return;
    }
    try {
      await api.addMember(memberGroup, memberStudent);
      setMemberStudent("");
      qc.invalidateQueries({ queryKey: ["group-members", memberGroup] });
      qc.invalidateQueries({ queryKey: ["group-members"] });
      msg.success("Öğrenci gruba eklendi");
    } catch (err) {
      showApiError(msg, err, "Öğrenci eklenemedi");
    }
  };

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Gruplar" subtitle="Öğrenci gruplarını yönet" />
        <Card className="mb-6">
          <h3 className="font-semibold mb-4">Yeni Grup</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <Input placeholder="Grup adı" value={form.group_name} onChange={(e) => setForm({ ...form, group_name: e.target.value })} />
            <select
              className="rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
              value={form.lesson_day}
              onChange={(e) => setForm({ ...form, lesson_day: e.target.value })}
            >
              <option value="">Ders günü seç</option>
              {DAYS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
            <input
              type="time"
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              value={form.lesson_hour}
              onChange={(e) => setForm({ ...form, lesson_hour: e.target.value })}
            />
            <Button onClick={create}>Oluştur</Button>
          </div>
        </Card>

        <Card className="mb-6">
          <h3 className="font-semibold mb-4">Öğrenci Ekle</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={memberGroup} onChange={(e) => setMemberGroup(e.target.value)}>
              <option value="">Grup seç</option>
              {(data as Group[] | undefined)?.map((g) => (
                <option key={g.id} value={g.id}>{g.group_name}</option>
              ))}
            </select>
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={memberStudent} onChange={(e) => setMemberStudent(e.target.value)}>
              <option value="">Öğrenci seç</option>
              {users?.map((u) => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
            <Button onClick={addMember}>Ekle</Button>
          </div>
        </Card>

        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {(data as Group[] | undefined)?.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
