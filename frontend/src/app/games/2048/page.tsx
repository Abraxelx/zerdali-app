"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gamepad2, RotateCcw, Trophy } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, Game2048Run, Game2048Stats } from "@/lib/api";
import {
  createInitialState,
  Direction,
  formatTile,
  Game2048State,
  move,
  tileColor,
} from "@/lib/games/2048/engine";
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["game-2048-stats"] }),
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

  return (
    <AuthGuard>
      <AppLayout variant={layoutVariant}>
        <PageHeader
          title="2048"
          subtitle="Ok tuşları veya kaydırma ile oyna — 2048'de durmaz, en yüksek karoya kadar devam eder."
        />

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
                  disabled={startMutation.isPending || !!s?.active_run}
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
              <h2 className="font-semibold flex items-center gap-2 mb-3">
                <Trophy size={18} className="text-amber-500" />
                Rekorların
              </h2>
              {s?.best_all_time ? (
                <p className="text-sm">
                  En iyi karo: <strong>{s.best_all_time.max_tile}</strong> · Skor:{" "}
                  <strong>{s.best_all_time.score}</strong>
                </p>
              ) : (
                <p className="text-sm text-zinc-500">Henüz bitmiş oyun yok.</p>
              )}
              <p className="text-xs text-zinc-500 mt-2">Bu hafta {s?.games_this_week ?? 0} oyun oynadın.</p>
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

            <Card>
              <p className="text-xs text-zinc-500 leading-relaxed">
                Faz 2&apos;de haftalık oyun limiti ve sıralama tablosu eklenecek. Şimdilik sınırsız
                oynayabilirsin.
              </p>
            </Card>
          </div>
        </div>
      </AppLayout>
    </AuthGuard>
  );
}
