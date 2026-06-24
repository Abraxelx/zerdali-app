"use client";

import { useQuery } from "@tanstack/react-query";
import { Gem, GraduationCap, Medal, Star, Trophy, Zap } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, IconBubble, LevelProgress, LoadingSpinner, PageHeader, StatCard, StudentRow } from "@/components/ui";
import { api, ClassLeaderboard, LeaderboardEntry } from "@/lib/api";
import { ParentProvider, ParentRequireStudent, ParentStudentPicker, useParentStudent } from "@/lib/parent";

function rankBadgeClass(rank: number) {
  if (rank === 1) return "bg-amber-400 text-white";
  if (rank === 2) return "bg-zinc-300 text-zinc-800 dark:bg-zinc-600 dark:text-zinc-100";
  if (rank === 3) return "bg-orange-300 text-orange-900";
  return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
}

function ParentDashboardContent() {
  const { selectedId, selectedProfile } = useParentStudent();

  const { data: points, isLoading: lp } = useQuery({
    queryKey: ["parent-points", selectedId],
    queryFn: () => api.getParentPoints(selectedId!),
    enabled: !!selectedId,
  });
  const { data: level, isLoading: ll } = useQuery({
    queryKey: ["parent-level", selectedId],
    queryFn: () => api.getParentLevel(selectedId!),
    enabled: !!selectedId,
  });
  const { data: leaderboards, isLoading: lb } = useQuery({
    queryKey: ["parent-leaderboard", selectedId],
    queryFn: () => api.getParentLeaderboard(selectedId!),
    enabled: !!selectedId,
  });
  const { data: teachers } = useQuery({ queryKey: ["teachers"], queryFn: api.getTeachers });

  if (!selectedId) return null;
  if (lp || ll || lb) return <LoadingSpinner />;

  return (
    <>
      <Card className="mb-6">
        <StudentRow
          name={selectedProfile?.full_name ?? "Öğrenci"}
          photoUrl={selectedProfile?.profile_photo_url}
          subtitle={selectedProfile ? `@${selectedProfile.username}` : undefined}
          size={52}
        />
      </Card>

      {teachers && teachers.length > 0 && (
        <Card className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <GraduationCap size={18} className="text-amber-500" />
            Öğretmen
          </h2>
          <div className="flex items-center gap-3">
            <IconBubble src={teachers[0].profile_photo_url} size={44} fallback={<GraduationCap size={20} />} />
            <div>
              <p className="font-medium">{teachers[0].full_name}</p>
              <p className="text-sm text-zinc-500">{teachers[0].bio || "Öğretmen"}</p>
            </div>
          </div>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={Zap} label="Zerdalyum" value={points?.total_zerdalyum ?? 0} color="amber" />
        <StatCard icon={Star} label="Güç" value={Math.round(level?.effective_power ?? 0)} sub={`×${level?.effective_multiplier ?? 1}`} color="purple" />
        <StatCard icon={Trophy} label="Seviye" value={level?.current_level?.title ?? "—"} color="blue" />
        <StatCard icon={Gem} label="Sıralama" value={leaderboards?.[0]?.leaderboard.find((e) => e.is_me)?.rank ?? "—"} color="green" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <Card>
          <h2 className="font-semibold mb-4">Seviye İlerlemesi</h2>
          <LevelProgress
            current={level?.current_level ?? null}
            next={level?.next_level ?? null}
            power={level?.effective_power ?? 0}
          />
        </Card>
      </div>

      {(leaderboards as ClassLeaderboard[] | undefined)?.map((board) => (
        <Card key={board.group_id} className="mb-4">
          <h2 className="mb-1 font-semibold">{board.group_name} — Sıralama</h2>
          <div className="mt-3 space-y-2">
            {board.leaderboard.map((entry: LeaderboardEntry) => (
              <div
                key={entry.profile.id}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  entry.is_me ? "bg-amber-500/10 border border-amber-400/40" : "bg-zinc-50 dark:bg-zinc-800/50"
                }`}
              >
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold ${rankBadgeClass(entry.rank ?? 0)}`}>
                  {entry.rank}
                </span>
                <StudentRow
                  name={entry.profile.full_name}
                  photoUrl={entry.profile.profile_photo_url}
                  subtitle={`${entry.total_zerdalyum} Z · ${Math.round(entry.effective_power)} güç`}
                  size={32}
                  className="flex-1"
                />
                {entry.rank === 1 && <Medal size={16} className="text-amber-500" />}
              </div>
            ))}
          </div>
        </Card>
      ))}
    </>
  );
}

export default function ParentPage() {
  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <ParentProvider>
          <PageHeader title="Veli Paneli" subtitle="Öğrencinin gelişimini takip et" />
          <ParentStudentPicker />
          <ParentRequireStudent>
            <ParentDashboardContent />
          </ParentRequireStudent>
        </ParentProvider>
      </AppLayout>
    </AuthGuard>
  );
}
