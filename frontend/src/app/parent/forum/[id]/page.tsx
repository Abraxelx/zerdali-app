"use client";

import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import {
  ForumAuthorRow,
  ForumReactionsBar,
  ForumTagBadge,
  emptyForumReactions,
} from "@/components/forum";
import { Button, Card, LoadingSpinner } from "@/components/ui";
import { api, ForumComment, ForumReactions, ForumTopicDetail, normalizeGroupId } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { setStoredForumGroupId } from "@/lib/forum-group-storage";
import { showApiError, useMessage } from "@/lib/messages";

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

function CommentBlock({
  comment,
  onReaction,
}: {
  comment: ForumComment;
  onReaction: (commentId: string, reactions: ForumReactions) => void;
}) {
  return (
    <div className="flex gap-3 py-4 border-b border-zinc-500/10 last:border-0">
      <ForumAuthorRow author={comment.author} size={36} className="shrink-0 w-36 sm:w-auto" />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-zinc-400 mb-1 sm:hidden">{formatWhen(comment.created_at)}</p>
        <p className="text-sm whitespace-pre-wrap break-words">{comment.body}</p>
        <ForumReactionsBar
          targetType="comment"
          targetId={comment.id}
          reactions={comment.reactions ?? emptyForumReactions}
          onUpdated={(next) => onReaction(comment.id, next)}
        />
        <p className="text-xs text-zinc-400 mt-2 hidden sm:block">{formatWhen(comment.created_at)}</p>
      </div>
    </div>
  );
}

export default function ParentForumTopicPage() {
  const params = useParams();
  const topicId = params.id as string;
  const { user } = useAuth();
  const msg = useMessage();
  const qc = useQueryClient();
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [topicReactions, setTopicReactions] = useState<ForumReactions>(emptyForumReactions);

  const { data: topic, isLoading } = useQuery({
    queryKey: ["forum-topic", topicId],
    queryFn: () => api.getForumTopic(topicId),
    enabled: !!topicId,
  });

  useEffect(() => {
    if (topic?.reactions) {
      setTopicReactions(topic.reactions);
    }
  }, [topic?.reactions]);

  useEffect(() => {
    const groupId = (topic as ForumTopicDetail | undefined)?.group?.id;
    if (groupId && user?.id) {
      setStoredForumGroupId(normalizeGroupId(groupId), user.id);
    }
  }, [topic, user?.id]);

  const handleComment = async () => {
    const text = comment.trim();
    if (!text) {
      msg.error("Boş yorum", "Bir şeyler yazmalısın.");
      return;
    }
    setSending(true);
    try {
      await api.createForumComment(topicId, text);
      setComment("");
      qc.invalidateQueries({ queryKey: ["forum-topic", topicId] });
      qc.invalidateQueries({ queryKey: ["forum-topics"] });
      msg.success("Yorum gönderildi");
    } catch (e) {
      showApiError(msg, e, "Yorum gönderilemedi");
    } finally {
      setSending(false);
    }
  };

  const handleCommentReaction = (commentId: string, reactions: ForumReactions) => {
    qc.setQueryData<ForumTopicDetail>(["forum-topic", topicId], (prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        comments: prev.comments.map((c) => (c.id === commentId ? { ...c, reactions } : c)),
      };
    });
  };

  if (isLoading || !topic) {
    return (
      <AuthGuard role="veli">
        <AppLayout variant="parent">
          <LoadingSpinner />
        </AppLayout>
      </AuthGuard>
    );
  }

  const t = topic as ForumTopicDetail;

  return (
    <AuthGuard role="veli">
      <AppLayout variant="parent">
        <Link
          href="/parent/forum"
          className="inline-flex items-center gap-1 text-sm text-amber-600 hover:underline mb-4"
        >
          <ArrowLeft size={16} /> Foruma dön
        </Link>

        {t.group && (
          <p className="text-xs text-zinc-500 mb-2">{t.group.group_name} sınıf forumu</p>
        )}

        <Card className="mb-6">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <h1 className="text-xl font-bold">{t.title}</h1>
            {t.tag && <ForumTagBadge tag={t.tag} />}
          </div>
          <p className="text-sm whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">{t.body}</p>
          <div className="mt-4 pt-4 border-t border-zinc-500/10 flex flex-wrap items-center gap-3">
            {t.author && <ForumAuthorRow author={t.author} size={40} />}
            <span className="text-xs text-zinc-400">{formatWhen(t.created_at)}</span>
          </div>
          <ForumReactionsBar
            targetType="topic"
            targetId={t.id}
            reactions={topicReactions}
            onUpdated={setTopicReactions}
          />
        </Card>

        <Card>
        <h2 className="font-semibold mb-1">Yorumlar ({t.comments.length})</h2>
        <p className="text-xs text-zinc-500 mb-4">En eskiden en yeniye sıralı — yorumlara beğeni/beğenmeme verebilirsin.</p>

          {t.comments.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">Henüz yorum yok — ilk yorumu sen yaz.</p>
          ) : (
            <div>
              {t.comments.map((c) => (
                <CommentBlock key={c.id} comment={c} onReaction={handleCommentReaction} />
              ))}
            </div>
          )}

          <div className="mt-6 pt-4 border-t border-zinc-500/10">
            <label className="block space-y-1 mb-3">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Yorum yaz</span>
              <textarea
                className="w-full rounded-lg border border-zinc-300/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-zinc-700/70 dark:bg-zinc-900/50 min-h-[88px]"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Düşüncelerini paylaş..."
              />
            </label>
            <Button onClick={handleComment} disabled={sending} className="inline-flex items-center gap-2">
              <Send size={16} />
              {sending ? "Gönderiliyor..." : "Gönder"}
            </Button>
          </div>
        </Card>
      </AppLayout>
    </AuthGuard>
  );
}
