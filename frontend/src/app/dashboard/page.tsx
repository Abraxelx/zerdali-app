"use client";

import { useQuery } from "@tanstack/react-query";
import { Gem, Star, Trophy, Zap } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LevelProgress, LoadingSpinner, PageHeader, RarityBadge, StatCard } from "@/components/ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

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

  if (lp || ll || lm) return <LoadingSpinner />;

  return (
    <>
      <PageHeader title="Panel" subtitle="Zerdalyum yolculuğuna hoş geldin" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard icon={Zap} label="Zerdalyum" value={points?.total_zerdalyum ?? 0} color="amber" />
        <StatCard icon={Star} label="Güç" value={Math.round(level?.effective_power ?? 0)} sub={`×${level?.effective_multiplier ?? 1} çarpan`} color="purple" />
        <StatCard icon={Trophy} label="Seviye" value={level?.current_level?.title ?? "—"} color="blue" />
        <StatCard icon={Gem} label="Meblağ" value={meblahs?.length ?? 0} color="green" />
      </div>

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
              {(meblahs as { meblah_types?: { name: string; rarity: string; zerdalyum_multiplier: number } }[]).map((m, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-zinc-50 dark:bg-zinc-800 p-3">
                  <span className="font-medium">{m.meblah_types?.name}</span>
                  <div className="flex items-center gap-2">
                    <RarityBadge rarity={m.meblah_types?.rarity ?? "common"} />
                    <span className="text-sm text-amber-500">×{m.meblah_types?.zerdalyum_multiplier}</span>
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
              <div key={i} className="flex justify-between text-sm border-b border-zinc-100 dark:border-zinc-800 pb-2">
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
