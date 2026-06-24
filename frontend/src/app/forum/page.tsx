"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Plus, Users } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, LoadingSpinner, PageHeader, StudentRow } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api, ForumGroup, ForumTopic, normalizeGroupId } from "@/lib/api";
import { getStoredForumGroupId, resolveForumGroupId, setStoredForumGroupId } from "@/lib/forum-group-storage";
import { showApiError, useMessage } from "@/lib/messages";
import { QUERY_STALE } from "@/lib/query-config";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function ForumShell({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const variant =
    user?.role === "superadmin" ? "admin" : user?.role === "veli" ? "parent" : "student";
  return (
    <AuthGuard>
      <AppLayout variant={variant}>{children}</AppLayout>
    </AuthGuard>
  );
}

export default function ForumPage() {
  const msg = useMessage();
  const qc = useQueryClient();
  const { user } = useAuth();

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ["forum-groups"],
    queryFn: api.getForumGroups,
    staleTime: QUERY_STALE.groups,
  });

  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [creating, setCreating] = useState(false);

  const forumScope = user?.id;

  useEffect(() => {
    if (!groups?.length) return;
    setSelectedGroupId((prev) => resolveForumGroupId(groups as ForumGroup[], forumScope, prev));
  }, [groups, forumScope]);

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    setStoredForumGroupId(groupId, forumScope);
    setShowForm(false);
  };

  const selectedGroup = useMemo(
    () =>
      (groups as ForumGroup[] | undefined)?.find(
        (g) => normalizeGroupId(g.id) === selectedGroupId
      ),
    [groups, selectedGroupId]
  );

  const {
    data: topics,
    isLoading: loadingTopics,
    isError: topicsError,
    error: topicsLoadError,
  } = useQuery({
    queryKey: ["forum-topics", selectedGroupId],
    queryFn: () => api.getForumTopics(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  const { data: quota } = useQuery({
    queryKey: ["forum-quota"],
    queryFn: api.getForumQuota,
  });

  const isParent = user?.role === "veli";
  const canCreate = !isParent && !!selectedGroupId && (quota?.can_create ?? false);
  const isAdmin = user?.role === "superadmin";

  const handleCreate = async () => {
    if (!selectedGroupId) return;
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      msg.error("Eksik bilgi", "Başlık ve konu metni gerekli.");
      return;
    }
    setCreating(true);
    try {
      await api.createForumTopic(selectedGroupId, { title: t, body: b });
      setTitle("");
      setBody("");
      setShowForm(false);
      qc.invalidateQueries({ queryKey: ["forum-topics", selectedGroupId] });
      qc.invalidateQueries({ queryKey: ["forum-quota"] });
      msg.success("Konu açıldı");
    } catch (e) {
      showApiError(msg, e, "Konu açılamadı");
    } finally {
      setCreating(false);
    }
  };

  if (loadingGroups) {
    return (
      <ForumShell>
        <LoadingSpinner />
      </ForumShell>
    );
  }

  if (!groups?.length) {
    return (
      <ForumShell>
        <PageHeader title="Forum" subtitle="Sınıf forumları" />
        <Card>
          <p className="text-center text-zinc-500 py-8">
            {isAdmin
              ? "Henüz aktif sınıf yok. Önce gruplar sayfasından sınıf oluştur."
              : isParent
                ? "Bağlı öğrencinin kayıtlı olduğu bir sınıf forumu yok."
                : "Henüz bir sınıfa kayıtlı değilsin. Öğretmeninden gruba eklenmeni iste."}
          </p>
        </Card>
      </ForumShell>
    );
  }

  return (
    <ForumShell>
      <PageHeader
        title="Forum"
        subtitle={
          selectedGroup
            ? `${selectedGroup.group_name} sınıf forumu`
            : "Sınıf bazlı tartışmalar"
        }
      />

      <Card className="mb-6">
        <label className="block space-y-1">
          <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-2">
            <Users size={16} /> Sınıf seç
          </span>
          <select
            className="w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
            value={selectedGroupId}
            onChange={(e) => selectGroup(e.target.value)}
          >
            {(groups as ForumGroup[]).map((g) => (
              <option key={normalizeGroupId(g.id)} value={normalizeGroupId(g.id)}>
                {g.group_name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-zinc-500 mt-2">
          {isParent
            ? "Veli olarak konu açamazsın; yorum yazabilirsin."
            : isAdmin
              ? "Her sınıfın kendi forumu vardır — sınırsız konu açabilirsin."
              : quota?.can_create
                ? "Bugün 1 konu açma hakkın var (tüm sınıflar toplamında)."
                : "Bugünkü konu hakkını kullandın — yarın tekrar deneyebilirsin."}
        </p>
      </Card>

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {canCreate ? (
          <Button onClick={() => setShowForm((v) => !v)} className="inline-flex items-center gap-2">
            <Plus size={16} />
            {showForm ? "Formu gizle" : "Yeni konu"}
          </Button>
        ) : (
          !isAdmin &&
          selectedGroupId && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Öğrenciler günde en fazla 1 konu açabilir.
            </p>
          )
        )}
      </div>

      {showForm && canCreate && (
        <Card className="mb-6">
          <h3 className="font-semibold mb-1">Yeni konu</h3>
          <p className="text-xs text-zinc-500 mb-4">{selectedGroup?.group_name} sınıfında açılacak</p>
          <div className="space-y-3">
            <Input label="Başlık" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Konu metni</span>
              <textarea
                className="w-full rounded-lg border border-zinc-300/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-zinc-700/70 dark:bg-zinc-900/50 min-h-[120px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Ne hakkında konuşmak istiyorsun?"
              />
            </label>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? "Açılıyor..." : "Konuyu aç"}
            </Button>
          </div>
        </Card>
      )}

      {loadingTopics ? (
        <LoadingSpinner />
      ) : topicsError ? (
        <Card>
          <p className="text-center text-red-500 py-8 text-sm">
            Konular yüklenemedi.{" "}
            {topicsLoadError instanceof Error ? topicsLoadError.message : "Tekrar dene."}
          </p>
        </Card>
      ) : topics && topics.length > 0 ? (
        <div className="space-y-3">
          {(topics as ForumTopic[]).map((topic) => (
            <Link key={topic.id} href={`/forum/${topic.id}`}>
              <Card className="transition hover:border-amber-400/40 hover:shadow-md cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 shrink-0">
                    <MessageSquare size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-lg truncate">{topic.title}</h3>
                    <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{topic.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      {topic.author && (
                        <StudentRow
                          name={topic.author.full_name}
                          photoUrl={topic.author.profile_photo_url}
                          size={24}
                          className="!gap-2"
                        />
                      )}
                      <span>{formatWhen(topic.created_at)}</span>
                      <span>{topic.comment_count ?? 0} yorum</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-center text-zinc-500 py-8">
            Bu sınıfta henüz konu yok. İlk konuyu sen aç!
          </p>
        </Card>
      )}
    </ForumShell>
  );
}
