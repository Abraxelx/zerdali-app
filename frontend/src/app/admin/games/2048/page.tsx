"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Gamepad2, Gift, Settings2 } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader } from "@/components/ui";
import { api, Game2048Settings } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

type MeblahType = { id: string; name: string; rarity: string };

export default function AdminGame2048Page() {
  const msg = useMessage();
  const qc = useQueryClient();
  const [weekKey, setWeekKey] = useState("");
  const [form, setForm] = useState<Partial<Game2048Settings>>({});

  const { data: settings, isLoading } = useQuery({
    queryKey: ["game-2048-settings"],
    queryFn: () => api.getGame2048Settings(),
  });

  const { data: meblahTypes } = useQuery({
    queryKey: ["meblah-types"],
    queryFn: () => api.getMeblahTypes() as Promise<MeblahType[]>,
  });

  const { data: rewards } = useQuery({
    queryKey: ["game-2048-rewards", weekKey || settings?.weekly_play_limit],
    queryFn: () => api.getGame2048WeeklyRewards(weekKey || undefined),
    enabled: !!settings,
  });

  const saveMutation = useMutation({
    mutationFn: () => api.updateGame2048Settings(form),
    onSuccess: () => {
      msg.success("2048 ayarları kaydedildi");
      qc.invalidateQueries({ queryKey: ["game-2048-settings"] });
      setForm({});
    },
    onError: (e) => showApiError(msg, e, "Kaydedilemedi"),
  });

  const distributeMutation = useMutation({
    mutationFn: (force: boolean) => api.distributeGame2048Rewards(weekKey || undefined, force),
    onSuccess: (res) => {
      msg.success(`${res.week_key} için ${res.granted_count} ödül dağıtıldı`);
      qc.invalidateQueries({ queryKey: ["game-2048-rewards"] });
    },
    onError: (e) => showApiError(msg, e, "Ödül dağıtılamadı"),
  });

  const s = settings as Game2048Settings | undefined;
  const val = (key: keyof Game2048Settings) =>
    form[key] !== undefined ? form[key] : s?.[key];

  if (isLoading) {
    return (
      <AuthGuard role="superadmin">
        <AppLayout variant="admin">
          <LoadingSpinner />
        </AppLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader
          title="2048 Ayarları"
          subtitle="Haftalık limit, ödüller ve otomatik dağıtım"
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Settings2 size={18} />
              Oyun ayarları
            </h2>
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!val("enabled")}
                  onChange={(e) => setForm((f) => ({ ...f, enabled: e.target.checked }))}
                />
                2048 etkin
              </label>
              <Input
                label="Haftalık oyun limiti"
                type="number"
                min={0}
                value={String(val("weekly_play_limit") ?? 5)}
                onChange={(e) => setForm((f) => ({ ...f, weekly_play_limit: parseInt(e.target.value, 10) }))}
              />
              <Input
                label="Katılım min. karo"
                type="number"
                value={String(val("participation_min_tile") ?? 512)}
                onChange={(e) => setForm((f) => ({ ...f, participation_min_tile: parseInt(e.target.value, 10) }))}
              />
              <Input
                label="Katılım Zerdalyum"
                type="number"
                value={String(val("participation_zerdalyum") ?? 5)}
                onChange={(e) => setForm((f) => ({ ...f, participation_zerdalyum: parseInt(e.target.value, 10) }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <Input
                  label="1. sıra"
                  type="number"
                  value={String(val("rank1_zerdalyum") ?? 50)}
                  onChange={(e) => setForm((f) => ({ ...f, rank1_zerdalyum: parseInt(e.target.value, 10) }))}
                />
                <Input
                  label="2. sıra"
                  type="number"
                  value={String(val("rank2_zerdalyum") ?? 30)}
                  onChange={(e) => setForm((f) => ({ ...f, rank2_zerdalyum: parseInt(e.target.value, 10) }))}
                />
                <Input
                  label="3. sıra"
                  type="number"
                  value={String(val("rank3_zerdalyum") ?? 20)}
                  onChange={(e) => setForm((f) => ({ ...f, rank3_zerdalyum: parseInt(e.target.value, 10) }))}
                />
                <Input
                  label="4–10. sıra"
                  type="number"
                  value={String(val("rank4_10_zerdalyum") ?? 10)}
                  onChange={(e) => setForm((f) => ({ ...f, rank4_10_zerdalyum: parseInt(e.target.value, 10) }))}
                />
              </div>
              <label className="block text-sm">
                <span className="text-zinc-500 mb-1 block">1. sıra meblağı</span>
                <select
                  className="w-full rounded-lg border border-zinc-300 dark:border-zinc-600 bg-transparent px-3 py-2 text-sm"
                  value={String(val("rank1_meblah_type_id") ?? "")}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rank1_meblah_type_id: e.target.value || null }))
                  }
                >
                  <option value="">Yok</option>
                  {(meblahTypes ?? []).map((mt) => (
                    <option key={mt.id} value={mt.id}>
                      {mt.name} ({mt.rarity})
                    </option>
                  ))}
                </select>
              </label>
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || Object.keys(form).length === 0}
              >
                {saveMutation.isPending ? "Kaydediliyor..." : "Kaydet"}
              </Button>
            </div>
          </Card>

          <Card>
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Gift size={18} />
              Haftalık ödül dağıtımı
            </h2>
            <p className="text-sm text-zinc-500 mb-3">
              Öğrenciler için sıralama ve katılım ödüllerini verir. Öğretmenler ödül almaz.
            </p>
            <Input
              label="Hafta (boş = bu hafta)"
              placeholder="2026-W26"
              value={weekKey}
              onChange={(e) => setWeekKey(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                onClick={() => distributeMutation.mutate(false)}
                disabled={distributeMutation.isPending}
              >
                Ödülleri dağıt
              </Button>
              <Button
                variant="secondary"
                onClick={() => distributeMutation.mutate(true)}
                disabled={distributeMutation.isPending}
              >
                Eksikleri tamamla (force)
              </Button>
              <a
                href="/games/2048"
                className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-white/60 hover:bg-white/80 text-zinc-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white"
              >
                <Gamepad2 size={16} />
                Oyunu aç
              </a>
            </div>

            {rewards?.rewards && rewards.rewards.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-2">
                  {rewards.week_key} dağıtımları ({rewards.rewards.length})
                </h3>
                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto">
                  {rewards.rewards.map((r) => (
                    <li key={r.id} className="text-zinc-600 dark:text-zinc-400">
                      {r.profiles?.full_name ?? r.player_id.slice(0, 8)} ·{" "}
                      {r.reward_kind === "rank" ? `#${r.rank}` : "katılım"} · +{r.zerdalyum}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
