"use client";

import Link from "next/link";
import { Gem, Trophy } from "lucide-react";
import { Card, IconBubble, LevelProgress, RarityBadge, StudentRow } from "@/components/ui";
import { ClassmatePublicProfile } from "@/lib/api";

export function ClassmateProfileView({ data }: { data: ClassmatePublicProfile }) {
  const { profile, points, level, meblahs, shared_groups } = data;

  return (
    <div className="space-y-6">
      <Card>
        <StudentRow
          name={profile.full_name}
          photoUrl={profile.profile_photo_url}
          subtitle={`@${profile.username}`}
          size={72}
        />
        {profile.bio ? (
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-300 whitespace-pre-wrap">{profile.bio}</p>
        ) : (
          <p className="mt-4 text-sm text-zinc-500 italic">Henüz bio eklenmemiş.</p>
        )}
        {shared_groups.length > 0 && (
          <p className="mt-3 text-xs text-zinc-500">
            Ortak sınıf: {shared_groups.map((g) => g.group_name).join(", ")}
          </p>
        )}
      </Card>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="text-center">
          <p className="text-2xl font-bold text-amber-500">{points.total_zerdalyum}</p>
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
        <div className="flex items-center gap-3 mb-4">
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
        <LevelProgress
          current={level.current_level ?? null}
          next={level.next_level ?? null}
          power={level.effective_power ?? 0}
        />
      </Card>

      <Card>
        <h2 className="font-semibold mb-4">Meblağlar</h2>
        {meblahs.length > 0 ? (
          <div className="space-y-2">
            {meblahs.map((m) => (
              <div
                key={m.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 dark:bg-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <IconBubble src={m.meblah_types?.icon_url} size={36} fallback={<Gem size={18} />} />
                  <span className="font-medium">{m.meblah_types?.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <RarityBadge rarity={m.meblah_types?.rarity ?? "common"} />
                  <span className="text-sm font-semibold text-amber-500">
                    ×{m.meblah_types?.zerdalyum_multiplier}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Henüz meblağı yok.</p>
        )}
      </Card>

      <p className="text-center">
        <Link href="/classmates" className="text-sm text-amber-600 hover:underline dark:text-amber-400">
          ← Sınıf arkadaşlarına dön
        </Link>
      </p>
    </div>
  );
}
