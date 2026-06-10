"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader, RarityBadge } from "@/components/ui";
import { api } from "@/lib/api";

export default function AdminGamificationPage() {
  const { data: meblahTypes, isLoading: lm } = useQuery({ queryKey: ["meblah-types"], queryFn: api.getMeblahTypes });
  const { data: levels, isLoading: ll } = useQuery({ queryKey: ["levels"], queryFn: api.getLevels });
  const { data: users } = useQuery({ queryKey: ["admin-users"], queryFn: () => api.getUsers("student") });
  const [edits, setEdits] = useState<Record<string, { name?: string; zerdalyum_multiplier?: string }>>({});
  const [levelEdits, setLevelEdits] = useState<Record<string, { title?: string; required_zerdalyum?: string }>>({});
  const [grantStudent, setGrantStudent] = useState("");
  const [grantMeblah, setGrantMeblah] = useState("");
  const qc = useQueryClient();

  const saveMeblah = async (id: string) => {
    const edit = edits[id];
    if (!edit) return;
    await api.updateMeblahType(id, {
      ...(edit.name && { name: edit.name }),
      ...(edit.zerdalyum_multiplier && { zerdalyum_multiplier: parseFloat(edit.zerdalyum_multiplier) }),
    });
    qc.invalidateQueries({ queryKey: ["meblah-types"] });
  };

  const saveLevel = async (id: string) => {
    const edit = levelEdits[id];
    if (!edit) return;
    await api.updateLevel(id, {
      ...(edit.title && { title: edit.title }),
      ...(edit.required_zerdalyum && { required_zerdalyum: parseInt(edit.required_zerdalyum) }),
    });
    qc.invalidateQueries({ queryKey: ["levels"] });
  };

  const grant = async () => {
    if (!grantStudent || !grantMeblah) return;
    await api.grantMeblah(grantStudent, grantMeblah);
    alert("Meblağ verildi");
  };

  if (lm || ll) return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin"><LoadingSpinner /></AppLayout>
    </AuthGuard>
  );

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Oyunlaştırma" subtitle="Meblağ ve seviye yönetimi" />

        <Card className="mb-6">
          <h3 className="font-semibold mb-4">Meblağ Ver</h3>
          <div className="grid gap-3 sm:grid-cols-3">
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={grantStudent} onChange={(e) => setGrantStudent(e.target.value)}>
              <option value="">Öğrenci seç</option>
              {users?.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
            </select>
            <select className="rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-2 text-sm" value={grantMeblah} onChange={(e) => setGrantMeblah(e.target.value)}>
              <option value="">Meblağ seç</option>
              {(meblahTypes as { id: string; name: string }[] | undefined)?.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
            <Button onClick={grant}>Ver</Button>
          </div>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <h3 className="font-semibold mb-4">Meblağ Tipleri</h3>
            {(meblahTypes as { id: string; name: string; rarity: string; zerdalyum_multiplier: number }[] | undefined)?.map((m) => (
              <div key={m.id} className="border-b border-zinc-100 dark:border-zinc-800 py-3 space-y-2">
                <div className="flex items-center gap-2">
                  <RarityBadge rarity={m.rarity} />
                  <span className="text-sm text-zinc-500">×{m.zerdalyum_multiplier}</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="İsim"
                    defaultValue={m.name}
                    onChange={(e) => setEdits({ ...edits, [m.id]: { ...edits[m.id], name: e.target.value } })}
                  />
                  <Input
                    placeholder="Çarpan"
                    defaultValue={String(m.zerdalyum_multiplier)}
                    onChange={(e) => setEdits({ ...edits, [m.id]: { ...edits[m.id], zerdalyum_multiplier: e.target.value } })}
                  />
                  <Button onClick={() => saveMeblah(m.id)}>Kaydet</Button>
                </div>
              </div>
            ))}
          </Card>

          <Card>
            <h3 className="font-semibold mb-4">Seviyeler</h3>
            {(levels as { id: string; level_number: number; title: string; required_zerdalyum: number }[] | undefined)?.map((l) => (
              <div key={l.id} className="border-b border-zinc-100 dark:border-zinc-800 py-3 space-y-2">
                <span className="text-xs text-zinc-400">Seviye {l.level_number}</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Başlık"
                    defaultValue={l.title}
                    onChange={(e) => setLevelEdits({ ...levelEdits, [l.id]: { ...levelEdits[l.id], title: e.target.value } })}
                  />
                  <Input
                    placeholder="Eşik"
                    defaultValue={String(l.required_zerdalyum)}
                    onChange={(e) => setLevelEdits({ ...levelEdits, [l.id]: { ...levelEdits[l.id], required_zerdalyum: e.target.value } })}
                  />
                  <Button onClick={() => saveLevel(l.id)}>Kaydet</Button>
                </div>
              </div>
            ))}
          </Card>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
