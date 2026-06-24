import { normalizeGroupId } from "./api";

function storageKey(scope?: string) {
  return scope ? `zerdali_forum_group_${scope}` : "zerdali_forum_group";
}

export function getStoredForumGroupId(scope?: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(storageKey(scope));
}

export function setStoredForumGroupId(groupId: string, scope?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey(scope), normalizeGroupId(groupId));
}

export function resolveForumGroupId(
  groups: { id: string | number }[],
  scope?: string,
  current?: string
): string {
  const ids = groups.map((g) => normalizeGroupId(g.id));
  if (!ids.length) return "";
  if (current && ids.includes(current)) return current;
  const stored = getStoredForumGroupId(scope);
  if (stored && ids.includes(stored)) return stored;
  return ids[0];
}
