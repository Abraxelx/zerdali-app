import { Profile } from "./api";

export type NotificationData = Record<string, string | number | boolean | null | undefined>;

export function normalizeNotificationData(raw: unknown): NotificationData {
  if (!raw) return {};
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as NotificationData;
      }
    } catch {
      return {};
    }
    return {};
  }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as NotificationData;
  }
  return {};
}

export function notificationHref(
  type: string,
  data: NotificationData | null | undefined,
  role: Profile["role"],
  href?: string | null
): string | null {
  if (href) return href;

  const isParent = role === "veli";
  const isAdmin = role === "superadmin";
  const d = normalizeNotificationData(data);
  const ntype = type.trim();

  switch (ntype) {
    case "FORUM_COMMENT": {
      const topicId = d.topic_id != null ? String(d.topic_id) : null;
      if (topicId) return isParent ? `/parent/forum/${topicId}` : `/forum/${topicId}`;
      return isParent ? "/parent/forum" : "/forum";
    }
    case "HOMEWORK_SUBMITTED":
      if (!isAdmin) return null;
      if (d.submission_id) return `/admin/approvals?submission=${d.submission_id}`;
      return "/admin/approvals";
    case "HOMEWORK_APPROVED":
    case "HOMEWORK_REJECTED":
    case "ASSIGNMENT_CREATED":
      return isParent ? "/parent/assignments" : "/assignments";
    case "LESSON_CREATED":
      return isParent ? null : "/lessons";
    case "POINTS": {
      const tx = d.transaction_type != null ? String(d.transaction_type) : undefined;
      if (isParent) {
        if (tx === "ATTENDANCE") return "/parent/attendance";
        if (tx === "LESSON_SCORE") return "/parent/scores";
        if (tx === "HOMEWORK") return "/parent/assignments";
        return "/parent";
      }
      if (tx === "ATTENDANCE") return "/attendance";
      if (tx === "LESSON_SCORE") return "/scores";
      if (tx === "HOMEWORK") return "/assignments";
      return "/dashboard";
    }
    case "MEBLAH_EARNED":
      return isParent ? "/parent" : "/dashboard";
    default:
      return null;
  }
}
