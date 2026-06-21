"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, FileDown, Paperclip } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, LoadingSpinner, PageHeader, StatusBadge } from "@/components/ui";
import { api } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

type Submission = {
  status: string;
  score?: number | null;
  feedback?: string | null;
  is_late?: boolean;
};

type Assignment = {
  id: string;
  title: string;
  description?: string;
  due_date: string;
  file_url?: string;
  submission?: Submission | null;
};

function dueInfo(due: string) {
  const diff = new Date(due).getTime() - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  if (diff < 0) return { text: "Süre doldu", cls: "text-red-500" };
  if (days <= 1) return { text: "Son gün!", cls: "text-orange-500" };
  if (days <= 3) return { text: `${days} gün kaldı`, cls: "text-amber-500" };
  return { text: `${days} gün kaldı`, cls: "text-zinc-400" };
}

export default function AssignmentsPage() {
  const msg = useMessage();
  const { data, isLoading } = useQuery({ queryKey: ["assignments"], queryFn: () => api.getAssignments() as Promise<Assignment[]> });
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [text, setText] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const qc = useQueryClient();

  const handleSubmit = async (id: string) => {
    const trimmed = (text[id] || "").trim();
    const file = files[id];

    if (!trimmed && !file) {
      msg.error("Teslim edilemedi", "En az bir teslim metni veya dosya eklemelisin.");
      return;
    }

    const form = new FormData();
    if (trimmed) form.append("submission_text", trimmed);
    if (file) form.append("file", file);

    setSubmitting(id);
    try {
      await api.submitAssignment(id, form);
      qc.invalidateQueries({ queryKey: ["assignments"] });
      setText({ ...text, [id]: "" });
      setFiles({ ...files, [id]: null });
      msg.success("Ödev teslim edildi", "Öğretmen onayından sonra puanın yansıyacak.");
    } catch (err) {
      showApiError(msg, err, "Teslim başarısız");
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Ödevler" subtitle="Metin veya dosya ile teslim edebilirsin — ikisi de opsiyonel değil, en az biri gerekli" />
        {isLoading ? (
          <LoadingSpinner />
        ) : data && data.length > 0 ? (
          <div className="space-y-4">
            {data.map((a) => {
              const sub = a.submission;
              const di = dueInfo(a.due_date);
              return (
                <Card key={a.id}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="font-semibold text-lg">{a.title}</h3>
                    {sub && <StatusBadge status={sub.status} isLate={sub.is_late} />}
                  </div>
                  {a.description && <p className="text-sm text-zinc-500 mt-1">{a.description}</p>}
                  <p className={`mt-2 inline-flex items-center gap-1 text-xs ${di.cls}`}>
                    <CalendarClock size={14} />
                    Son tarih: {new Date(a.due_date).toLocaleDateString("tr-TR")} · {di.text}
                  </p>
                  {a.file_url && (
                    <a href={a.file_url} target="_blank" rel="noopener" className="ml-3 inline-flex items-center gap-1 text-sm text-amber-600 hover:underline">
                      <FileDown size={14} /> Ödev dosyası
                    </a>
                  )}

                  {sub ? (
                    <div className="mt-4 rounded-lg bg-zinc-50 p-4 dark:bg-zinc-800">
                      {sub.status === "approved" && (
                        <p className="text-sm font-medium text-green-600">
                          Onaylandı · {sub.score != null ? `${sub.score} not → +${sub.score * 10} Zerdalyum` : "puan verildi"}
                        </p>
                      )}
                      {sub.status === "pending" && (
                        <p className="text-sm text-amber-600">Teslimin alındı, öğretmen onayı bekleniyor.</p>
                      )}
                      {sub.status === "rejected" && (
                        <p className="text-sm text-red-600">Teslimin reddedildi. Tekrar gönderemezsin.</p>
                      )}
                      {sub.feedback && (
                        <p className="mt-2 text-sm text-zinc-500">
                          <span className="font-medium">Geri bildirim:</span> {sub.feedback}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="mt-4 space-y-2">
                      <textarea
                        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
                        placeholder="Teslim metni (opsiyonel — dosya varsa boş bırakabilirsin)"
                        rows={3}
                        value={text[a.id] || ""}
                        onChange={(e) => setText({ ...text, [a.id]: e.target.value })}
                      />
                      <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                        <Paperclip size={15} />
                        <span>{files[a.id]?.name ?? "Dosya ekle (PDF, Word, zip…)"}</span>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.csv,.zip,.rar,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={(e) => setFiles({ ...files, [a.id]: e.target.files?.[0] ?? null })}
                        />
                      </label>
                      <Button onClick={() => handleSubmit(a.id)} disabled={submitting === a.id}>
                        {submitting === a.id ? "Gönderiliyor..." : "Teslim Et"}
                      </Button>
                      <p className="text-xs text-zinc-400">Tek teslim hakkın var. Metin veya dosyadan en az biri zorunlu.</p>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        ) : (
          <Card><p className="text-zinc-500">Henüz ödev yok</p></Card>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
