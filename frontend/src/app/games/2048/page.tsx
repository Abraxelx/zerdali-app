"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, RotateCcw, Trophy, Users } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader, StudentRow } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  api,
  Game2048ClassLeaderboards,
  Game2048Leaderboard,
  Game2048Run,
  Game2048Stats,
} from "@/lib/api";
import {
  createInitialState,
  Direction,
  formatTile,
  Game2048State,
  move,
  tileColor,
} from "@/lib/games/2048/engine";
import { registerGame2048Sw } from "@/lib/games/2048/register-sw";
import { showApiError, useMessage } from "@/lib/messages";

function useDuration(active: boolean) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  return seconds;
}

function GameBoard({ state }: { state: Game2048State }) {
  return (
    <div className="grid grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-stone-700/20 dark:bg-stone-900/40">
      {state.grid.flatMap((row, r) =>
        row.map((value, c) => {
          const colors = tileColor(value);
          return (
            <div
              key={`${r}-${c}`}
              className="aspect-square rounded-lg flex items-center justify-center font-bold select-none transition-colors"
              style={{
                backgroundColor: colors.bg,
                color: colors.text,
                fontSize: value >= 1024 ? "1rem" : value >= 128 ? "1.25rem" : "1.5rem",
              }}
            >
              {formatTile(value)}
            </div>
          );
        })
      )}
    </div>
  );
}

export default function Game2048Page() {
  const { user } = useAuth();
  const msg = useMessage();
  const qc = useQueryClient();
  const [phase, setPhase] = useState<"idle" | "playing" | "finished">("idle");
  const [boardTab, setBoardTab] = useState<"global" | "class">("global");
  const [runId, setRunId] = useState<string | null>(null);
  const [state, setState] = useState<Game2048State>(() => createInitialState());
  const [result, setResult] = useState<Game2048Run | null>(null);
  const startedAt = useRef<number>(0);
  const durationSec = useDuration(phase === "playing");

  const canPlay = user?.role === "student" || user?.role === "superadmin";
  const layoutVariant = user?.role === "superadmin" ? "admin" : "student";

  const { data: stats, isLoading } = useQuery({
    queryKey: ["game-2048-stats"],
    queryFn: () => api.getGame2048Stats(),
    enabled: canPlay,
  });

  const { data: leaderboard } = useQuery({
    queryKey: ["game-2048-leaderboard"],
    queryFn: () => api.getGame2048Leaderboard(),
    enabled: canPlay,
  });

  const { data: classBoards } = useQuery({
    queryKey: ["game-2048-class-leaderboard"],
    queryFn: () => api.getGame2048ClassLeaderboards(),
    enabled: canPlay && boardTab === "class",
  });

  useEffect(() => {
    registerGame2048Sw();
  }, []);

  const startMutation = useMutation({
    mutationFn: api.startGame2048,
    onSuccess: (run) => {
      setRunId(run.id);
      setState(createInitialState());
      setResult(null);
      setPhase("playing");
      startedAt.current = Date.now();
    },
    onError: (e) => showApiError(msg, e, "Oyun başlatılamadı"),
  });

  const abandonMutation = useMutation({
    mutationFn: api.abandonGame2048,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["game-2048-stats"] });
      qc.invalidateQueries({ queryKey: ["game-2048-leaderboard"] });
    },
    onError: (e) => showApiError(msg, e, "Oyun iptal edilemedi"),
  });

  const finishMutation = useMutation({
    mutationFn: (payload: { runId: string; score: number; max_tile: number; moves: number; duration_sec: number }) =>
      api.finishGame2048(payload.runId, {
        score: payload.score,
        max_tile: payload.max_tile,
        moves: payload.moves,
        duration_sec: payload.duration_sec,
      }),
    onSuccess: (run) => {
      setResult(run);
      setPhase("finished");
      setRunId(null);
      qc.invalidateQueries({ queryKey: ["game-2048-stats"] });
      qc.invalidateQueries({ queryKey: ["game-2048-leaderboard"] });
    },
    onError: (e) => showApiError(msg, e, "Skor kaydedilemedi"),
  });

  const submitFinish = useCallback(
    (finalState: Game2048State) => {
      if (!runId) return;
      const elapsed = Math.max(1, Math.round((Date.now() - startedAt.current) / 1000));
      finishMutation.mutate({
        runId,
        score: finalState.score,
        max_tile: finalState.maxTile,
        moves: finalState.moves,
        duration_sec: elapsed,
      });
    },
    [runId, finishMutation]
  );

  const handleMove = useCallback(
    (direction: Direction) => {
      if (phase !== "playing" || finishMutation.isPending) return;
      setState((prev) => {
        const next = move(prev, direction);
        if (!next) return prev;
        if (next.gameOver) {
          window.setTimeout(() => submitFinish(next), 0);
        }
        return next;
      });
    },
    [phase, finishMutation.isPending, submitFinish]
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      };
      const dir = map[e.key];
      if (!dir) return;
      e.preventDefault();
      handleMove(dir);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, handleMove]);

  if (!canPlay) {
    return (
      <AuthGuard>
        <AppLayout variant="parent">
          <Card>
            <p className="text-center text-zinc-500 py-8">2048 yalnızca öğrenci ve öğretmen hesapları tarafından oynanabilir.</p>
          </Card>
        </AppLayout>
      </AuthGuard>
    );
  }

  if (isLoading) {
    return (
      <AuthGuard>
        <AppLayout variant={layoutVariant}>
          <LoadingSpinner />
        </AppLayout>
      </AuthGuard>
    );
  }

  const s = stats as Game2048Stats | undefined;
  const board = leaderboard as Game2048Leaderboard | undefined;
  const classData = classBoards as Game2048ClassLeaderboards | undefined;
  const quota = s?.quota;
  const canStart =
    !!quota?.can_start && !s?.active_run && phase === "idle" && !startMutation.isPending;
  const quotaMessage = !quota?.enabled
    ? "2048 şu an kapalı."
    : quota.games_remaining <= 0
      ? `Bu hafta oyun hakkın doldu (${quota.weekly_limit}).`
      : `Bu hafta ${quota.games_remaining}/${quota.weekly_limit} oyun hakkın kaldı.`;

  return (
    <AuthGuard>
      <AppLayout variant={layoutVariant}>
        <PageHeader
          title="2048"
          subtitle="Ok tuşları veya kaydırma ile oyna — 2048'de durmaz, en yüksek karoya kadar devam eder."
        />

        {quota && (
          <p
            className={`text-sm mb-4 ${
              quota.can_start ? "text-zinc-600 dark:text-zinc-400" : "text-amber-600 dark:text-amber-400"
            }`}
          >
            {quotaMessage}
          </p>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Skor</p>
                  <p className="text-xl font-bold text-amber-600">{phase === "idle" ? "—" : state.score}</p>
                </div>
                <div>
                  <p className="text-zinc-500">En yüksek karo</p>
                  <p className="text-xl font-bold">{phase === "idle" ? "—" : state.maxTile}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Hamle</p>
                  <p className="text-xl font-bold">{phase === "idle" ? "—" : state.moves}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Süre</p>
                  <p className="text-xl font-bold">{phase === "playing" ? `${durationSec}s` : "—"}</p>
                </div>
              </div>
              {phase === "idle" && s?.active_run && (
                <p className="text-sm text-amber-600 dark:text-amber-400 mb-3">
                  Yarım kalmış bir oyun var. İptal edip yeni oyun başlatabilirsin.
                  <button
                    type="button"
                    className="ml-2 underline"
                    onClick={() => abandonMutation.mutate(s.active_run!.id)}
                  >
                    İptal et
                  </button>
                </p>
              )}
              {phase === "idle" && (
                <Button
                  onClick={() => startMutation.mutate()}
                  disabled={!canStart}
                  className="inline-flex items-center gap-2"
                >
                  <Gamepad2 size={16} />
                  {startMutation.isPending ? "Başlatılıyor..." : "Oyunu başlat"}
                </Button>
              )}
              {phase === "playing" && state.wonTile && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">2048'e ulaştın — devam et!</p>
              )}
            </div>

            {phase === "idle" ? (
              <div className="rounded-2xl border border-dashed border-zinc-400/40 py-16 text-center text-zinc-500">
                Oyunu başlatınca tahta burada görünür.
              </div>
            ) : (
              <div
                className="touch-none max-w-md mx-auto"
                onTouchStart={(e) => {
                  const touch = e.changedTouches[0];
                  (e.currentTarget as HTMLElement & { _tx?: number; _ty?: number })._tx = touch.clientX;
                  (e.currentTarget as HTMLElement & { _tx?: number; _ty?: number })._ty = touch.clientY;
                }}
                onTouchEnd={(e) => {
                  const el = e.currentTarget as HTMLElement & { _tx?: number; _ty?: number };
                  if (el._tx == null || el._ty == null) return;
                  const touch = e.changedTouches[0];
                  const dx = touch.clientX - el._tx;
                  const dy = touch.clientY - el._ty;
                  if (Math.abs(dx) < 24 && Math.abs(dy) < 24) return;
                  if (Math.abs(dx) > Math.abs(dy)) {
                    handleMove(dx > 0 ? "right" : "left");
                  } else {
                    handleMove(dy > 0 ? "down" : "up");
                  }
                }}
              >
                <GameBoard state={state} />
              </div>
            )}

            {phase === "finished" && result && (
              <div className="mt-6 rounded-xl bg-amber-500/10 border border-amber-400/30 p-4">
                <p className="font-semibold mb-1">Oyun bitti — skor kaydedildi</p>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  Skor: {result.score} · En yüksek karo: {result.max_tile} · {result.moves} hamle
                </p>
                <Button className="mt-3" onClick={() => setPhase("idle")}>
                  <RotateCcw size={16} className="inline mr-2" />
                  Yeni oyun
                </Button>
              </div>
            )}

            {phase === "playing" && state.gameOver && finishMutation.isPending && (
              <p className="mt-4 text-center text-sm text-zinc-500">Skor kaydediliyor...</p>
            )}
          </Card>

          <div className="space-y-4">
            <Card>
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="font-semibold flex items-center gap-2">
                  <Trophy size={18} className="text-amber-500" />
                  Haftalık sıralama
                </h2>
                <div className="flex rounded-lg border border-zinc-300/50 dark:border-zinc-600/50 text-xs overflow-hidden">
                  <button
                    type="button"
                    className={`px-2 py-1 ${boardTab === "global" ? "bg-amber-500/20 font-semibold" : ""}`}
                    onClick={() => setBoardTab("global")}
                  >
                    Genel
                  </button>
                  <button
                    type="button"
                    className={`px-2 py-1 inline-flex items-center gap-1 ${boardTab === "class" ? "bg-amber-500/20 font-semibold" : ""}`}
                    onClick={() => setBoardTab("class")}
                  >
                    <Users size={12} />
                    Sınıf
                  </button>
                </div>
              </div>
              <p className="text-xs text-zinc-500 mb-3">
                {boardTab === "global"
                  ? `${board?.week_key ?? s?.week_key} · Öğrenci ve öğretmenler`
                  : `${classData?.week_key ?? s?.week_key} · Sınıf arkadaşların`}
              </p>
              {boardTab === "global" ? (
                board?.entries && board.entries.length > 0 ? (
                  <ul className="space-y-2">
                    {board.entries.map((entry) => (
                      <li
                        key={entry.player_id}
                        className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                          entry.is_me ? "bg-amber-500/10 border border-amber-400/30" : ""
                        }`}
                      >
                        <span className="w-6 text-center text-sm font-bold text-zinc-400">{entry.rank}</span>
                        <StudentRow
                          name={entry.full_name}
                          photoUrl={entry.profile_photo_url}
                          subtitle={`${entry.role_label} · ${entry.max_tile} karo · ${entry.score} puan`}
                          size={32}
                          className="flex-1 min-w-0"
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-zinc-500">Bu hafta henüz bitmiş oyun yok.</p>
                )
              ) : classData?.boards && classData.boards.length > 0 ? (
                <div className="space-y-4">
                  {classData.boards.map((groupBoard) => (
                    <div key={groupBoard.group_id}>
                      <p className="text-sm font-medium mb-2">{groupBoard.group_name}</p>
                      {groupBoard.entries.length > 0 ? (
                        <ul className="space-y-2">
                          {groupBoard.entries.map((entry) => (
                            <li
                              key={`${groupBoard.group_id}-${entry.player_id}`}
                              className={`flex items-center gap-3 rounded-lg px-2 py-2 ${
                                entry.is_me ? "bg-amber-500/10 border border-amber-400/30" : ""
                              }`}
                            >
                              <span className="w-6 text-center text-sm font-bold text-zinc-400">{entry.rank}</span>
                              <StudentRow
                                name={entry.full_name}
                                photoUrl={entry.profile_photo_url}
                                subtitle={`${entry.max_tile} karo · ${entry.score} puan`}
                                size={32}
                                className="flex-1 min-w-0"
                              />
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-zinc-500">Bu sınıfta henüz skor yok.</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500">Sınıf sıralaması için bir gruba kayıtlı olmalısın.</p>
              )}
            </Card>

            <Card>
              <h3 className="font-semibold mb-3 text-sm">Rekorların & ödüller</h3>
              {s?.best_all_time ? (
                <p className="text-sm">
                  En iyi karo: <strong>{s.best_all_time.max_tile}</strong> · Skor:{" "}
                  <strong>{s.best_all_time.score}</strong>
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Henüz bitmiş oyun yok.</p>
              )}
              <p className="text-xs text-zinc-500 mt-2">
                Bu hafta {s?.games_this_week ?? 0}/{quota?.weekly_limit ?? 5} oyun oynadın.
              </p>
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">
                Haftalık ödüller: 1. +50 Zerdalyum (+ meblağ), 2. +30, 3. +20, 4–10. +10 · 512+ karo
                katılım +5. Ödüller admin tarafından hafta sonunda dağıtılır.
              </p>
            </Card>

            {s?.recent_runs && s.recent_runs.length > 0 && (
              <Card>
                <h3 className="font-semibold mb-3 text-sm">Son oyunlar</h3>
                <ul className="space-y-2 text-sm">
                  {s.recent_runs.map((run) => (
                    <li key={run.id} className="flex justify-between text-zinc-600 dark:text-zinc-400">
                      <span>{run.max_tile} karo</span>
                      <span>{run.score} puan</span>
                    </li>
                  ))}
                </ul>
              </Card>
            )}

          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
