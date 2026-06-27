"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { MessageSquare, Users } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { ForumAuthorRow, ForumTagBadge } from "@/components/forum";
import { api, ForumGroup, ForumTopic, normalizeGroupId } from "@/lib/api";
import { resolveForumGroupId, setStoredForumGroupId } from "@/lib/forum-group-storage";
import { useAuth } from "@/lib/auth";
import { ParentProvider, ParentRequireStudent, ParentStudentPicker, useParentStudent } from "@/lib/parent";
import { QUERY_STALE } from "@/lib/query-config";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function ParentForumContent() {
  const { user } = useAuth();
  const { selectedId } = useParentStudent();
  const forumScope = user?.id;

  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ["forum-groups", selectedId],
    queryFn: api.getForumGroups,
    staleTime: QUERY_STALE.groups,
    enabled: !!selectedId,
  });

  const [selectedGroupId, setSelectedGroupId] = useState("");

  useEffect(() => {
    if (!groups?.length) {
      setSelectedGroupId("");
      return;
    }
    setSelectedGroupId((prev) => resolveForumGroupId(groups as ForumGroup[], forumScope, prev));
  }, [groups, forumScope]);

  const selectGroup = (groupId: string) => {
    setSelectedGroupId(groupId);
    if (forumScope) setStoredForumGroupId(groupId, forumScope);
  };

  const selectedGroup = useMemo(
    () => (groups as ForumGroup[] | undefined)?.find((g) => normalizeGroupId(g.id) === selectedGroupId),
    [groups, selectedGroupId]
  );

  const { data: topics, isLoading: loadingTopics } = useQuery({
    queryKey: ["forum-topics", selectedGroupId],
    queryFn: () => api.getForumTopics(selectedGroupId),
    enabled: !!selectedGroupId,
  });

  if (loadingGroups) return <LoadingSpinner />;

  if (!groups?.length) {
    return (
      <Card>
        <p className="text-center text-zinc-500 py-8 text-sm">
          Öğrencinin kayıtlı olduğu bir sınıf forumu yok veya henüz sınıfa eklenmemiş.
        </p>
      </Card>
    );
  }

  return (
    <>
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
          Veli olarak konu açamazsın; mevcut konulara yorum yazabilirsin.
        </p>
      </Card>

      {loadingTopics ? (
        <LoadingSpinner />
      ) : topics && topics.length > 0 ? (
        <div className="space-y-3">
          {(topics as ForumTopic[]).map((topic) => (
            <Link key={topic.id} href={`/parent/forum/${topic.id}`}>
              <Card className="transition hover:border-amber-400/40 hover:shadow-md cursor-pointer">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-amber-500/10 p-3 text-amber-600 dark:text-amber-400 shrink-0">
                    <MessageSquare size={22} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold text-lg truncate">{topic.title}</h3>
                      {topic.tag && <ForumTagBadge tag={topic.tag} />}
                    </div>
                    <p className="text-sm text-zinc-500 line-clamp-2 mt-1">{topic.body}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                      {topic.author && (
                        <ForumAuthorRow author={topic.author} size={24} className="!gap-2" />
                      )}
                      <span>{formatWhen(topic.created_at)}</span>
                      <span>{topic.comment_count ?? 0} yorum</span>
                      <span>{topic.reactions?.like_count ?? 0} beğeni</span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-center text-zinc-500 py-8 text-sm">
            {selectedGroup ? `${selectedGroup.group_name} sınıfında henüz konu yok.` : "Konu bulunamadı."}
          </p>
        </Card>
      )}
    </>
  );
}

export default function ParentForumPage() {
  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <ParentProvider>
          <PageHeader title="Sınıf Forumu" subtitle="Öğrencinin sınıf tartışmalarını oku" />
          <ParentStudentPicker />
          <ParentRequireStudent>
            <ParentForumContent />
          </ParentRequireStudent>
        </ParentProvider>
      </AppLayout>
    </AuthGuard>
  );
}
