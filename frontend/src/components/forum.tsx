"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { StudentRow } from "@/components/ui";
import { api, ForumAuthor, ForumReactions, ForumTag } from "@/lib/api";
import { showApiError, useMessage } from "@/lib/messages";

export function forumAuthorSubtitle(author: ForumAuthor | null | undefined) {
  if (!author) return undefined;
  if (author.role === "superadmin") return "Öğretmen";
  if (author.role === "veli") return "Veli";
  return `@${author.username}`;
}

export function forumAuthorDisplayName(author: ForumAuthor | null | undefined, fallback = "Kullanıcı") {
  const name = author?.full_name ?? fallback;
  const levelTitle = author?.current_level?.title;
  if (!levelTitle) return name;
  return `${name} [${levelTitle}]`;
}

export function ForumTagBadge({ tag }: { tag: ForumTag }) {
  const color = tag.color || "#a855f7";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
      style={{ backgroundColor: color }}
    >
      {tag.label}
    </span>
  );
}

export function ForumReactionsBar({
  targetType,
  targetId,
  reactions,
  onUpdated,
  compact = false,
}: {
  targetType: "topic" | "comment";
  targetId: string;
  reactions: ForumReactions;
  onUpdated: (next: ForumReactions) => void;
  compact?: boolean;
}) {
  const msg = useMessage();
  const [busy, setBusy] = useState(false);

  const handle = async (reaction: "like" | "dislike") => {
    if (busy) return;
    const nextReaction = reactions.user_reaction === reaction ? null : reaction;
    setBusy(true);
    try {
      const res = await api.setForumReaction({
        target_type: targetType,
        target_id: targetId,
        reaction: nextReaction,
      });
      onUpdated(res.reactions);
    } catch (e) {
      showApiError(msg, e, "Tepki kaydedilemedi");
    } finally {
      setBusy(false);
    }
  };

  const likeActive = reactions.user_reaction === "like";
  const dislikeActive = reactions.user_reaction === "dislike";

  return (
    <div className={`flex items-center gap-2 ${compact ? "" : "mt-2"}`}>
      <button
        type="button"
        disabled={busy}
        onClick={() => handle("like")}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
          likeActive
            ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
            : "text-zinc-500 hover:bg-zinc-500/10"
        }`}
        aria-pressed={likeActive}
      >
        <ThumbsUp size={14} />
        {reactions.like_count}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => handle("dislike")}
        className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs transition ${
          dislikeActive
            ? "bg-red-500/15 text-red-600 dark:text-red-400"
            : "text-zinc-500 hover:bg-zinc-500/10"
        }`}
        aria-pressed={dislikeActive}
      >
        <ThumbsDown size={14} />
        {reactions.dislike_count}
      </button>
    </div>
  );
}

export function ForumAuthorRow({
  author,
  size = 36,
  className = "",
}: {
  author: ForumAuthor | null | undefined;
  size?: number;
  className?: string;
}) {
  return (
    <StudentRow
      name={forumAuthorDisplayName(author)}
      photoUrl={author?.profile_photo_url}
      subtitle={forumAuthorSubtitle(author)}
      size={size}
      className={className}
    />
  );
}

export const emptyForumReactions: ForumReactions = {
  like_count: 0,
  dislike_count: 0,
  user_reaction: null,
};

export function ForumTagField({
  label,
  value,
  onChange,
  tags,
  listId = "forum-tag-suggestions",
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  tags: ForumTag[];
  listId?: string;
}) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>}
      <input
        list={listId}
        className="w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Etiket seç veya yeni yaz..."
        maxLength={50}
      />
      <datalist id={listId}>
        {tags.map((tag) => (
          <option key={tag.id} value={tag.label} />
        ))}
      </datalist>
      <p className="text-xs text-zinc-500">Mevcut bir etiketi seçebilir veya yeni etiket oluşturabilirsin.</p>
    </label>
  );
}

export function ForumTopicEditor({
  initialTitle,
  initialBody,
  initialTagLabel,
  tags,
  saving,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  initialBody: string;
  initialTagLabel: string;
  tags: ForumTag[];
  saving: boolean;
  onSave: (payload: { title: string; body: string; tag_label: string }) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initialTitle);
  const [body, setBody] = useState(initialBody);
  const [tagLabel, setTagLabel] = useState(initialTagLabel);

  return (
    <div className="space-y-3">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Başlık</span>
        <input
          className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
        />
      </label>
      <ForumTagField label="Etiket" value={tagLabel} onChange={setTagLabel} tags={tags} listId="forum-tag-edit" />
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Konu metni</span>
        <textarea
          className="w-full rounded-lg border border-zinc-300/70 bg-white/70 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-zinc-700/70 dark:bg-zinc-900/50 min-h-[120px]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => onSave({ title: title.trim(), body: body.trim(), tag_label: tagLabel.trim() })}
          className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {saving ? "Kaydediliyor..." : "Kaydet"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onCancel}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm dark:border-zinc-700"
        >
          İptal
        </button>
      </div>
    </div>
  );
}
