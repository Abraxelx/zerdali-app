"use client";

import { Suspense, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, FileDown, XCircle } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader, StatusBadge, StudentRow } from "@/components/ui";
import { api } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

type PendingSubmission = {
  id: string;
  submission_text?: string;
  file_url?: string;
  is_late?: boolean;
  created_at?: string;
  profiles?: { full_name: string; username: string; profile_photo_url?: string | null };
  assignments?: { title: string; due_date: string };
};

export default function AdminApprovalsPage() {
  return (
    <Suspense
      fallback={
        <AuthGuard role="superadmin">
          <AppLayout variant="admin">
            <LoadingSpinner />
          </AppLayout>
        </AuthGuard>
      }
    >
      <AdminApprovalsContent />
    </Suspense>
  );
}

function AdminApprovalsContent() {
  const msg = useMessage();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const highlightId = searchParams.get("submission");
  const { data, isLoading } = useQuery({
    queryKey: ["pending-submissions"],
    queryFn: () => api.getPendingSubmissions() as Promise<PendingSubmission[]>,
  });
  const [scores, setScores] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  const review = useMutation({
    mutationFn: ({ id, action, score, fb }: { id: string; action: "approve" | "reject"; score?: number; fb?: string }) =>
      api.reviewSubmission(id, action, score, fb),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["pending-submissions"] });
      msg.success(vars.action === "approve" ? "Ödev onaylandı" : "Ödev reddedildi");
    },
    onError: (e) => showApiError(msg, e, "İşlem başarısız"),
  });

  const approve = (id: string) => {
    const score = parseInt(scores[id]);
    if (isNaN(score)) {
      msg.error("Puan gerekli", "Onaylamak için 0–100 arası bir puan gir (örn. 8).");
      return;
    }
    review.mutate({ id, action: "approve", score, fb: feedback[id] });
  };

  const reject = (id: string) => {
    if (!confirm("Bu ödevi reddetmek istediğine emin misin? Öğrenci tekrar gönderemez.")) return;
    review.mutate({ id, action: "reject", fb: feedback[id] });
  };

  const submissions = data ?? [];

  useEffect(() => {
    if (!highlightId || !submissions.length) return;
    const el = document.getElementById(`submission-${highlightId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [highlightId, submissions]);

  return (
    <AuthGuard role="superadmin">
      <AppLayout variant="admin">
        <PageHeader title="Ödev Onayları" subtitle="Bekleyen teslimleri onayla veya reddet — puan onayda verilir" />

        {isLoading ? (
          <LoadingSpinner />
        ) : submissions.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <CheckCircle2 className="text-green-500" size={40} />
              <p className="font-medium">Bekleyen teslim yok</p>
              <p className="text-sm text-zinc-500">Tüm ödevler değerlendirildi.</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">{submissions.length} ödev onay bekliyor</p>
            {submissions.map((s) => (
              <div
                key={s.id}
                id={`submission-${s.id}`}
                className={s.id === highlightId ? "rounded-2xl ring-2 ring-amber-400/50" : undefined}
              >
              <Card className="border-l-4 border-l-amber-400">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold">{s.assignments?.title ?? "Ödev"}</h3>
                    <StudentRow
                      name={s.profiles?.full_name ?? "Öğrenci"}
                      photoUrl={s.profiles?.profile_photo_url}
                      subtitle={s.profiles?.username ? `@${s.profiles.username}` : undefined}
                      size={32}
                      className="mt-2"
                    />
                  </div>
                  <StatusBadge status="pending" isLate={s.is_late} />
                </div>

                {s.submission_text && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                    {s.submission_text}
                  </div>
                )}
                {s.file_url && (
                  <a
                    href={s.file_url}
                    target="_blank"
                    rel="noopener"
                    className="mt-2 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline"
                  >
                    <FileDown size={15} /> Teslim dosyasını indir
                  </a>
                )}

                <div className="mt-4 grid gap-3 sm:grid-cols-[120px_1fr]">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    placeholder="Puan"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={scores[s.id] || ""}
                    onChange={(e) => setScores({ ...scores, [s.id]: e.target.value })}
                  />
                  <input
                    placeholder="Geri bildirim (opsiyonel)"
                    className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                    value={feedback[s.id] || ""}
                    onChange={(e) => setFeedback({ ...feedback, [s.id]: e.target.value })}
                  />
                </div>
                <p className="mt-1 text-xs text-zinc-400">Puan × 10 Zerdalyum olarak verilir (örn. 8 → 80 Zerdalyum)</p>

                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  <Button onClick={() => approve(s.id)} disabled={review.isPending}>
                    <span className="inline-flex items-center gap-1"><CheckCircle2 size={15} /> Onayla & Puanla</span>
                  </Button>
                  <Button variant="danger" onClick={() => reject(s.id)} disabled={review.isPending}>
                    <span className="inline-flex items-center gap-1"><XCircle size={15} /> Reddet</span>
                  </Button>
                </div>
              </Card>
              </div>
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
