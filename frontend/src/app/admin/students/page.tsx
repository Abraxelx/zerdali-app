"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, Gem, Trash2, Trophy } from "lucide-react";
import { useMemo, useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import {
  Button,
  Card,
  IconBubble,
  Input,
  LoadingSpinner,
  PageHeader,
  RarityBadge,
  StudentAvatar,
  StudentRow,
} from "@/components/ui";
import { api, StudentMeblah, StudentOverview, StudentSummary } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";
import { QUERY_STALE } from "@/lib/query-config";

function StudentDetail({ studentId, onUpdated }: { studentId: string; onUpdated: () => void }) {
  const msg = useMessage();
  const qc = useQueryClient();
  const { data: overview, isLoading } = useQuery({
    queryKey: ["student-overview", studentId],
    queryFn: () => api.getStudentOverview(studentId),
  });
  const { data: meblahTypes } = useQuery({
    queryKey: ["meblah-types"],
    queryFn: () => api.getMeblahTypes() as Promise<{ id: string; name: string; rarity: string }[]>,
    staleTime: QUERY_STALE.staticCatalog,
  });

  const [pointAmount, setPointAmount] = useState("");
  const [pointDesc, setPointDesc] = useState("");
  const [grantMeblahId, setGrantMeblahId] = useState("");
  const [busy, setBusy] = useState(false);

  const grantPoints = async () => {
    const amount = parseInt(pointAmount, 10);
    if (isNaN(amount) || amount === 0) {
      msg.error("Geçersiz miktar", "0 dışında bir sayı gir (negatif = düşür).");
      return;
    }
    setBusy(true);
    try {
      await api.grantPoints(studentId, amount, pointDesc || "Admin düzenleme");
      setPointAmount("");
      setPointDesc("");
      qc.invalidateQueries({ queryKey: ["student-overview", studentId] });
      qc.invalidateQueries({ queryKey: ["students-summary"] });
      onUpdated();
      msg.success("Puan güncellendi");
    } catch (e) {
      showApiError(msg, e, "Puan verilemedi");
    } finally {
      setBusy(false);
    }
  };

  const grantMeblah = async () => {
    if (!grantMeblahId) {
      msg.error("Meblağ seç", "Listeden bir meblağ tipi seç.");
      return;
    }
    setBusy(true);
    try {
      await api.grantMeblah(studentId, grantMeblahId);
      setGrantMeblahId("");
      qc.invalidateQueries({ queryKey: ["student-overview", studentId] });
      qc.invalidateQueries({ queryKey: ["students-summary"] });
      onUpdated();
      msg.success("Meblağ verildi");
    } catch (e) {
      showApiError(msg, e, "Meblağ verilemedi");
    } finally {
      setBusy(false);
    }
  };

  const removeMeblah = async (recordId: string) => {
    if (!confirm("Bu meblağı öğrenciden kaldırmak istediğine emin misin?")) return;
    setBusy(true);
    try {
      await api.removeStudentMeblah(studentId, recordId);
      qc.invalidateQueries({ queryKey: ["student-overview", studentId] });
      qc.invalidateQueries({ queryKey: ["students-summary"] });
      onUpdated();
      msg.success("Meblağ kaldırıldı");
    } catch (e) {
      showApiError(msg, e, "Meblağ kaldırılamadı");
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !overview) return <LoadingSpinner />;

  const o = overview as StudentOverview;
  const level = o.level;

  return (
    <div className="space-y-4">
      <Card>
        <StudentRow
          name={o.profile.full_name}
          photoUrl={o.profile.profile_photo_url}
          subtitle={`@${o.profile.username} · ${o.profile.email}`}
          size={52}
        />
        {o.groups.length > 0 && (
          <p className="text-xs text-zinc-500 mt-3">
            Gruplar:{" "}
            {o.groups.map((g) => g.student_groups?.group_name).filter(Boolean).join(", ") || "—"}
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-500">{o.points.total_zerdalyum}</p>
          <p className="text-xs text-zinc-500 mt-1">Zerdalyum</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">×{level.effective_multiplier.toFixed(1)}</p>
          <p className="text-xs text-zinc-500 mt-1">Meblağ çarpanı</p>
        </Card>
        <Card className="text-center">
          <p className="text-2xl font-bold">{Math.round(level.effective_power)}</p>
          <p className="text-xs text-zinc-500 mt-1">Etkin güç</p>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-3 mb-3">
          <IconBubble src={level.current_level?.icon_url} size={44} fallback={<Trophy size={20} />} />
          <div>
            <p className="font-semibold">
              Seviye {level.current_level?.level_number ?? "—"} — {level.current_level?.title ?? "Başlangıç"}
            </p>
            {level.next_level && (
              <p className="text-xs text-zinc-500">
                Sonraki: {level.next_level.title} ({level.next_level.required_zerdalyum} güç)
              </p>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Puan düzenle</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Input
            label="Miktar (+ / −)"
            type="number"
            value={pointAmount}
            onChange={(e) => setPointAmount(e.target.value)}
            placeholder="örn. 50 veya -10"
          />
          <Input
            label="Açıklama"
            value={pointDesc}
            onChange={(e) => setPointDesc(e.target.value)}
            placeholder="Admin düzenleme"
          />
          <div className="flex items-end">
            <Button className="w-full" onClick={grantPoints} disabled={busy}>
              Uygula
            </Button>
          </div>
        </div>
        {o.points.recent_transactions?.length > 0 && (
          <div className="mt-4 border-t border-zinc-500/10 pt-3">
            <p className="text-xs font-medium text-zinc-500 mb-2">Son işlemler</p>
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {o.points.recent_transactions.slice(0, 8).map((tx, i) => (
                <li key={i} className="text-xs text-zinc-500 flex justify-between gap-2">
                  <span className="truncate">{tx.description}</span>
                  <span className={tx.amount >= 0 ? "text-green-600" : "text-red-500"}>
                    {tx.amount >= 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <Card>
        <h3 className="font-semibold mb-3">Meblağlar ({o.meblahs.length})</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {o.meblahs.length === 0 ? (
            <p className="text-sm text-zinc-500">Henüz meblağ yok</p>
          ) : (
            o.meblahs.map((m: StudentMeblah) => (
              <div
                key={m.id}
                className="relative flex flex-col items-center gap-1 rounded-xl bg-zinc-500/5 p-2 min-w-[72px]"
              >
                <IconBubble src={m.meblah_types?.icon_url} size={40} fallback={<Gem size={18} />} />
                <p className="text-[10px] font-medium text-center leading-tight">{m.meblah_types?.name}</p>
                <RarityBadge rarity={m.meblah_types?.rarity ?? "common"} />
                <p className="text-[10px] text-zinc-400">×{m.meblah_types?.zerdalyum_multiplier}</p>
                <button
                  type="button"
                  onClick={() => removeMeblah(m.id)}
                  className="absolute -top-1 -right-1 rounded-full bg-red-500 p-0.5 text-white hover:bg-red-600"
                  title="Kaldır"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            ))
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <select
            className="min-w-0 flex-1 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm"
            value={grantMeblahId}
            onChange={(e) => setGrantMeblahId(e.target.value)}
          >
            <option value="">Meblağ tipi seç</option>
            {meblahTypes?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} ({t.rarity})
              </option>
            ))}
          </select>
          <Button className="shrink-0" onClick={grantMeblah} disabled={busy}>
            Ver
          </Button>
        </div>
      </Card>
    </div>
  );
}

export default function AdminStudentsPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const qc = useQueryClient();

  const { data: summaries, isLoading } = useQuery({
    queryKey: ["students-summary"],
    queryFn: api.getStudentsSummary,
    staleTime: QUERY_STALE.studentsSummary,
  });

  const filtered = useMemo(() => {
    const list = (summaries as StudentSummary[] | undefined) ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (s) =>
        s.profile.full_name.toLowerCase().includes(q) ||
        s.profile.username.toLowerCase().includes(q) ||
        s.profile.email.toLowerCase().includes(q)
    );
  }, [summaries, search]);

  const selected = filtered.find((s) => s.profile.id === selectedId) ?? filtered[0];

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader
          title="Öğrenciler"
          subtitle="Puan sıralamasına göre — en yüksek güç üstte"
        />

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div>
          <div className="mb-4">
            <Input
              placeholder="İsim, kullanıcı adı veya e-posta ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
            {isLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1 lg:max-h-[calc(100vh-12rem)]">
                {filtered.map((s) => {
                  const active = (selectedId ?? filtered[0]?.profile.id) === s.profile.id;
                  return (
                    <button
                      key={s.profile.id}
                      type="button"
                      onClick={() => setSelectedId(s.profile.id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-amber-400/60 bg-amber-500/10"
                          : "border-zinc-500/10 bg-white/40 hover:bg-white/60 dark:bg-white/5 dark:hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-xs font-bold text-amber-600 dark:text-amber-400">
                          {s.rank ?? "—"}
                        </span>
                        <StudentAvatar
                          name={s.profile.full_name}
                          photoUrl={s.profile.profile_photo_url}
                          size={40}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{s.profile.full_name}</p>
                          <p className="text-xs text-zinc-500">
                            {s.total_zerdalyum} Z · ×{s.effective_multiplier.toFixed(1)} ·{" "}
                            {s.current_level ? `Sv.${s.current_level.level_number}` : "Sv.?"}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-zinc-400 shrink-0" />
                      </div>
                    </button>
                  );
                })}
                {filtered.length === 0 && (
                  <p className="text-sm text-zinc-500 text-center py-8">Öğrenci bulunamadı</p>
                )}
              </div>
            )}
          </div>

          <div>
            {selected ? (
              <StudentDetail
                studentId={selected.profile.id}
                onUpdated={() => qc.invalidateQueries({ queryKey: ["students-summary"] })}
              />
            ) : (
              <Card>
                <p className="text-zinc-500 text-sm text-center py-12">Detay için bir öğrenci seç</p>
              </Card>
            )}
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
