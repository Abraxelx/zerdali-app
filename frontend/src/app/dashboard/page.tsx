"use client";

import { useQuery } from "@tanstack/react-query";
import { Gem, GraduationCap, Medal, Star, Trophy, Zap } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, IconBubble, LevelProgress, LoadingSpinner, PageHeader, RarityBadge, StatCard, StudentRow } from "@/components/ui";
import { api, ClassLeaderboard, LeaderboardEntry, TeacherProfile } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-amber-400 text-white";
  if (rank === 2) return "bg-zinc-300 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100";
  if (rank === 3) return "bg-orange-300 text-orange-900 dark:bg-orange-800 dark:text-orange-100";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function RankBadge({ rank }: { rank: number }) {
  return (
    <span
      className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(rank)}`}
    >
      {rank}
    </span>
  );
}

function TeacherCard({ teachers }: { teachers: TeacherProfile[] }) {
  if (!teachers.length) return null;

  return (
    <Card className="mb-6">
      <h2 className="mb-4 flex items-center gap-2 font-semibold">
        <GraduationCap size={18} className="text-amber-500" />
        Öğretmenin
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {teachers.map((t) => (
          <div
            key={t.id}
            className="flex items-start gap-4 rounded-xl bg-amber-500/5 p-4 dark:bg-amber-500/10"
          >
            <IconBubble src={t.profile_photo_url} size={56} fallback={<GraduationCap size={24} />} />
            <div className="min-w-0">
              <p className="font-semibold">{t.full_name}</p>
              <p className="text-sm text-amber-600 dark:text-amber-400">Öğretmen</p>
              {t.bio && <p className="mt-2 text-sm text-zinc-500">{t.bio}</p>}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function LeaderboardTable({ entries }: { entries: LeaderboardEntry[] }) {
  if (!entries.length) {
    return <p className="text-sm text-zinc-500">Bu sınıfta henüz sıralama yok.</p>;
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div
          key={entry.profile.id}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
            entry.is_me
              ? "border border-amber-400/50 bg-amber-500/10"
              : "bg-zinc-50 dark:bg-zinc-800/50"
          }`}
        >
          <RankBadge rank={entry.rank ?? 0} />
          <StudentRow
            name={entry.profile.full_name}
            photoUrl={entry.profile.profile_photo_url}
            subtitle={`${entry.total_zerdalyum} Z · ${Math.round(entry.effective_power)} güç`}
            size={36}
            className="flex-1"
          />
          {entry.is_me && (
            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:text-amber-300">
              Sen
            </span>
          )}
          {entry.rank === 1 && <Medal size={16} className="shrink-0 text-amber-500" />}
        </div>
      ))}
    </div>
  );
}

function ClassLeaderboards({ boards }: { boards: ClassLeaderboard[] }) {
  if (!boards.length) {
    return (
      <Card className="mb-6">
        <h2 className="mb-2 font-semibold">Sınıf Sıralaması</h2>
        <p className="text-sm text-zinc-500">
          Henüz bir sınıfa kayıtlı değilsin. Öğretmeninden gruba eklenmeni iste.
        </p>
      </Card>
    );
  }

  return (
    <div className="mb-6 space-y-4">
      {boards.map((board) => (
        <Card key={board.group_id}>
          <h2 className="mb-1 font-semibold">{board.group_name}</h2>
          <p className="mb-4 text-xs text-zinc-500">Sınıf puan sıralaması (Zerdalyum × çarpan)</p>
          <LeaderboardTable entries={board.leaderboard} />
        </Card>
      ))}
    </div>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  const { data: points, isLoading: lp } = useQuery({
    queryKey: ["points"],
    queryFn: api.getPoints,
    enabled: !!user,
  });
  const { data: level, isLoading: ll } = useQuery({
    queryKey: ["level"],
    queryFn: api.getLevel,
    enabled: !!user,
  });
  const { data: meblahs, isLoading: lm } = useQuery({
    queryKey: ["meblahs"],
    queryFn: api.getMeblahs,
    enabled: !!user,
  });
  const { data: teachers, isLoading: lt } = useQuery({
    queryKey: ["teachers"],
    queryFn: api.getTeachers,
    enabled: !!user,
  });
  const { data: leaderboards, isLoading: lb } = useQuery({
    queryKey: ["class-leaderboard"],
    queryFn: api.getClassLeaderboard,
    enabled: !!user,
  });

  if (lp || ll || lm || lt || lb) return <LoadingSpinner />;

  return (
    <>
      <PageHeader title={`Merhaba, ${user?.full_name?.split(" ")[0] ?? ""} 👋`} subtitle="Zerdalyum yolculuğuna hoş geldin" />

      {teachers && <TeacherCard teachers={teachers} />}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={Zap} label="Zerdalyum" value={points?.total_zerdalyum ?? 0} color="amber" />
        <StatCard icon={Star} label="Güç" value={Math.round(level?.effective_power ?? 0)} sub={`×${level?.effective_multiplier ?? 1} çarpan`} color="purple" />
        <StatCard icon={Trophy} label="Seviye" value={level?.current_level?.title ?? "—"} color="blue" />
        <StatCard icon={Gem} label="Meblağ" value={meblahs?.length ?? 0} color="green" />
      </div>

      {leaderboards && <ClassLeaderboards boards={leaderboards} />}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-semibold mb-4">Seviye İlerlemesi</h2>
          <LevelProgress
            current={level?.current_level ?? null}
            next={level?.next_level ?? null}
            power={level?.effective_power ?? 0}
          />
        </Card>

        <Card>
          <h2 className="font-semibold mb-4">Meblağlarım</h2>
          {meblahs && meblahs.length > 0 ? (
            <div className="space-y-2">
              {(meblahs as { meblah_types?: { name: string; rarity: string; zerdalyum_multiplier: number; icon_url?: string | null } }[]).map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-xl bg-zinc-50 p-3 transition hover:scale-[1.01] dark:bg-zinc-800">
                  <div className="flex items-center gap-3">
                    <IconBubble src={m.meblah_types?.icon_url} size={36} fallback={<Gem size={18} />} />
                    <span className="font-medium">{m.meblah_types?.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RarityBadge rarity={m.meblah_types?.rarity ?? "common"} />
                    <span className="text-sm font-semibold text-amber-500">×{m.meblah_types?.zerdalyum_multiplier}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-zinc-500 text-sm">Henüz meblağın yok</p>
          )}
        </Card>
      </div>

      {points?.recent_transactions && points.recent_transactions.length > 0 && (
        <Card className="mt-6">
          <h2 className="font-semibold mb-4">Son İşlemler</h2>
          <div className="space-y-2">
            {(points.recent_transactions as { amount: number; type: string; description: string }[]).map((tx, i) => (
              <div key={i} className="flex flex-col gap-1 border-b border-zinc-100 pb-2 text-sm sm:flex-row sm:justify-between dark:border-zinc-800">
                <span>{tx.description}</span>
                <span className={`font-medium animate-point-pop ${tx.amount > 0 ? "text-green-500" : "text-red-500"}`}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}

export default function DashboardPage() {
  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <DashboardContent />
      </AppLayout>
    </AuthGuard>
  );
}
