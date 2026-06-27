const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

import { ApiError, friendlyApiMessage } from "./messages";
export { ApiError, friendlyApiMessage };

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: "student" | "superadmin" | "veli";
  profile_photo_url?: string;
  bio?: string;
};

export type LoginLog = {
  id: string;
  user_id: string;
  entry_type: "login" | "session";
  logged_in_at: string;
  ip_address?: string | null;
  user_agent?: string | null;
  profiles?: Pick<Profile, "id" | "full_name" | "username" | "email" | "role" | "profile_photo_url"> | null;
};

export type GroupMember = {
  student_id: string;
  joined_at?: string;
  profiles?: Pick<Profile, "id" | "full_name" | "username" | "email" | "profile_photo_url"> | null;
};

export type StudentSummary = {
  rank?: number;
  profile: Profile;
  total_zerdalyum: number;
  effective_multiplier: number;
  effective_power: number;
  current_level: {
    level_number: number;
    title: string;
    required_zerdalyum: number;
    icon_url?: string | null;
  } | null;
};

export type LeaderboardEntry = StudentSummary & { is_me?: boolean };

export type ClassLeaderboard = {
  group_id: string;
  group_name: string;
  leaderboard: LeaderboardEntry[];
};

export type ClassmateProfile = Pick<Profile, "id" | "full_name" | "username" | "bio" | "profile_photo_url" | "role">;

export type ClassmateGroup = {
  group_id: string;
  group_name: string;
  classmates: ClassmateProfile[];
};

export type ClassmateList = {
  groups: ClassmateGroup[];
};

export type ClassmatePublicProfile = {
  profile: ClassmateProfile;
  points: { total_zerdalyum: number };
  level: StudentLevel;
  meblahs: StudentMeblah[];
  shared_groups: { group_id: string; group_name: string }[];
  is_me?: boolean;
};

export type TeacherProfile = Pick<Profile, "id" | "full_name" | "username" | "bio" | "profile_photo_url" | "role">;

export type GuardianLink = {
  student_id: string;
  guardian_id?: string;
  linked_at?: string;
  profile?: Profile | null;
};

export type OnlineUser = Pick<Profile, "id" | "full_name" | "username" | "role" | "profile_photo_url"> & {
  last_seen_at?: string | null;
};

export type StudentLevel = {
  effective_power: number;
  effective_multiplier: number;
  current_level: StudentSummary["current_level"];
  next_level: StudentSummary["current_level"];
};

export type StudentMeblah = {
  id: string;
  earned_at?: string;
  meblah_types?: {
    id: string;
    name: string;
    rarity: string;
    zerdalyum_multiplier: number;
    icon_url?: string | null;
  };
};

export type StudentOverview = {
  profile: Profile;
  points: { total_zerdalyum: number; recent_transactions: { amount: number; description: string; created_at: string }[] };
  level: StudentLevel;
  meblahs: StudentMeblah[];
  groups: { group_id: string; student_groups?: { group_name: string } }[];
};

export type ForumAuthor = Pick<Profile, "id" | "full_name" | "username" | "profile_photo_url" | "role"> & {
  current_level?: { title: string; level_number: number } | null;
};

export type ForumTag = {
  id: string;
  slug?: string | null;
  label: string;
  color?: string | null;
  sort_order?: number;
  created_by?: string | null;
};

export type ForumReactions = {
  like_count: number;
  dislike_count: number;
  user_reaction: "like" | "dislike" | null;
};

export type ForumTopic = {
  id: string;
  title: string;
  body: string;
  author_id: string;
  group_id: string;
  tag_id?: string | null;
  created_at: string;
  author?: ForumAuthor | null;
  tag?: ForumTag | null;
  comment_count?: number;
  reactions?: ForumReactions;
  group?: { id: string; group_name: string };
};

export type ForumGroup = {
  id: string | number;
  group_name: string;
  lesson_day?: number;
  lesson_hour?: number | string;
  is_active?: boolean;
};

/** Grup id bigint/string karışımını URL ve select için normalize eder. */
export function normalizeGroupId(id: string | number | undefined | null): string {
  if (id === undefined || id === null) return "";
  return String(id);
}

export type ForumComment = {
  id: string;
  topic_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author?: ForumAuthor | null;
  reactions?: ForumReactions;
};

export type ForumTopicDetail = ForumTopic & {
  comments: ForumComment[];
  can_edit?: boolean;
  can_edit_tag?: boolean;
};

export type Game2048Run = {
  id: string;
  week_key: string;
  score: number;
  max_tile: number;
  moves: number;
  duration_sec: number;
  status: "active" | "finished" | "abandoned";
  started_at: string;
  finished_at?: string | null;
};

export type Game2048Stats = {
  week_key: string;
  games_this_week: number;
  quota: Game2048Quota;
  active_run: Game2048Run | null;
  best_all_time: { score: number; max_tile: number; moves: number; finished_at?: string } | null;
  recent_runs: Game2048Run[];
};

export type Game2048Quota = {
  enabled: boolean;
  weekly_limit: number;
  games_used: number;
  games_remaining: number;
  can_start: boolean;
};

export type Game2048LeaderboardEntry = {
  rank: number;
  player_id: string;
  full_name: string;
  profile_photo_url?: string | null;
  role: "student" | "superadmin";
  role_label: string;
  max_tile: number;
  score: number;
  moves: number;
  is_me?: boolean;
};

export type Game2048Leaderboard = {
  week_key: string;
  entries: Game2048LeaderboardEntry[];
};

export type Game2048ClassBoard = {
  group_id: string;
  group_name: string;
  entries: Game2048LeaderboardEntry[];
};

export type Game2048ClassLeaderboards = {
  week_key: string;
  boards: Game2048ClassBoard[];
};

export type Game2048Settings = {
  enabled: boolean;
  weekly_play_limit: number;
  participation_min_tile: number;
  participation_zerdalyum: number;
  rank1_zerdalyum: number;
  rank2_zerdalyum: number;
  rank3_zerdalyum: number;
  rank4_10_zerdalyum: number;
  rank1_meblah_type_id: string | null;
};

export type Game2048WeeklyReward = {
  id: string;
  week_key: string;
  player_id: string;
  reward_kind: "rank" | "participation";
  rank?: number | null;
  zerdalyum: number;
  meblah_type_id?: string | null;
  granted_at: string;
  profiles?: { full_name?: string; username?: string };
};

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("zerdali_token");
}

export function setToken(token: string) {
  localStorage.setItem("zerdali_token", token);
}

export function clearToken() {
  localStorage.removeItem("zerdali_token");
}

export function roleHomePath(role: Profile["role"]) {
  if (role === "superadmin") return "/admin";
  if (role === "veli") return "/parent";
  return "/dashboard";
}

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const raw = (data as { error?: string }).error || friendlyApiMessage(res.status, "");
    throw new ApiError(res.status, raw);
  }
  return data as T;
}

export const api = {
  register: (body: { email: string; password: string; full_name: string; username: string }) =>
    apiFetch<{ access_token?: string; user_id: string }>("/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  login: (body: { email: string; password: string }) =>
    apiFetch<{ access_token: string; refresh_token: string; user_id: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),

  me: () => apiFetch<Profile>("/auth/me"),

  getNotifications: () => apiFetch<unknown[]>("/notifications"),
  markNotificationRead: (id: string) =>
    apiFetch(`/notifications/${id}/read`, { method: "POST" }),
  markAllNotificationsRead: () =>
    apiFetch("/notifications/read-all", { method: "POST" }),

  // Student
  getPoints: () => apiFetch<{ total_zerdalyum: number; recent_transactions: unknown[] }>("/student/points"),
  getLevel: () =>
    apiFetch<{
      effective_power: number;
      effective_multiplier: number;
      current_level: { level_number: number; title: string; required_zerdalyum: number; icon_url?: string | null } | null;
      next_level: { level_number: number; title: string; required_zerdalyum: number; icon_url?: string | null } | null;
    }>("/student/level"),
  getMeblahs: () => apiFetch<unknown[]>("/student/meblahs"),
  getAchievements: () => apiFetch<unknown[]>("/student/achievements"),
  getLessons: () => apiFetch<unknown[]>("/student/lessons"),
  getAttendance: () => apiFetch<unknown[]>("/student/attendance"),
  getScores: () => apiFetch<unknown[]>("/student/scores"),
  getAssignments: () => apiFetch<unknown[]>("/student/assignments"),
  getGroups: () => apiFetch<unknown[]>("/student/groups"),
  getTeachers: () => apiFetch<TeacherProfile[]>("/student/teachers"),
  getClassLeaderboard: () => apiFetch<ClassLeaderboard[]>("/student/leaderboard"),
  getClassmates: () => apiFetch<ClassmateList>("/student/classmates"),
  getClassmateProfile: (studentId: string) =>
    apiFetch<ClassmatePublicProfile>(`/student/classmates/${studentId}`),
  getGame2048Stats: () => apiFetch<Game2048Stats>("/games/2048/stats"),
  getGame2048Quota: () => apiFetch<Game2048Quota>("/games/2048/quota"),
  getGame2048Leaderboard: () => apiFetch<Game2048Leaderboard>("/games/2048/leaderboard"),
  getGame2048ClassLeaderboards: () => apiFetch<Game2048ClassLeaderboards>("/games/2048/leaderboard/class"),
  startGame2048: () => apiFetch<Game2048Run>("/games/2048/start", { method: "POST" }),
  finishGame2048: (
    runId: string,
    body: { score: number; max_tile: number; moves: number; duration_sec: number }
  ) =>
    apiFetch<Game2048Run>(`/games/2048/runs/${runId}/finish`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  abandonGame2048: (runId: string) =>
    apiFetch<Game2048Run>(`/games/2048/runs/${runId}/abandon`, { method: "POST" }),
  getGame2048Settings: () => apiFetch<Game2048Settings>("/admin/games/2048/settings"),
  updateGame2048Settings: (body: Partial<Game2048Settings>) =>
    apiFetch<Game2048Settings>("/admin/games/2048/settings", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  distributeGame2048Rewards: (weekKey?: string, force?: boolean) =>
    apiFetch<{ week_key: string; granted_count: number }>("/admin/games/2048/distribute", {
      method: "POST",
      body: JSON.stringify({ week_key: weekKey, force: !!force }),
    }),
  getGame2048WeeklyRewards: (weekKey?: string) =>
    apiFetch<{ week_key: string; rewards: Game2048WeeklyReward[] }>(
      `/admin/games/2048/rewards${weekKey ? `?week_key=${encodeURIComponent(weekKey)}` : ""}`
    ),
  submitAssignment: (id: string, body: FormData) =>
    apiFetch(`/student/assignments/${id}/submit`, { method: "POST", body }),
  updateProfile: (body: Record<string, string>) =>
    apiFetch<Profile>("/student/profile", { method: "PUT", body: JSON.stringify(body) }),
  uploadProfilePhoto: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string; profile: Profile }>("/upload/profile", { method: "POST", body: fd });
  },

  // Admin
  getUsers: (role?: string) => apiFetch<Profile[]>(`/admin/users${role ? `?role=${role}` : ""}`),
  getLoginLogs: (limit = 100) => apiFetch<LoginLog[]>(`/admin/login-logs?limit=${limit}`),
  updateUserRole: (id: string, role: string) =>
    apiFetch(`/admin/users/${id}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
  getAdminGroups: () => apiFetch<unknown[]>("/admin/groups"),
  createGroup: (body: Record<string, string>) =>
    apiFetch("/admin/groups", { method: "POST", body: JSON.stringify(body) }),
  updateGroup: (id: string, body: Record<string, unknown>) =>
    apiFetch(`/admin/groups/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteGroup: (id: string) => apiFetch(`/admin/groups/${id}`, { method: "DELETE" }),
  addMember: (groupId: string, studentId: string) =>
    apiFetch(`/admin/groups/${groupId}/members`, {
      method: "POST",
      body: JSON.stringify({ student_id: studentId }),
    }),
  getGroupMembers: (groupId: string) => apiFetch<GroupMember[]>(`/admin/groups/${groupId}/members`),
  removeMember: (groupId: string, studentId: string) =>
    apiFetch(`/admin/groups/${groupId}/members/${studentId}`, { method: "DELETE" }),
  getAdminLessons: (groupId?: string) =>
    apiFetch<unknown[]>(`/admin/lessons${groupId ? `?group_id=${groupId}` : ""}`),
  createLesson: (body: Record<string, string>) =>
    apiFetch("/admin/lessons", { method: "POST", body: JSON.stringify(body) }),
  markAttendance: (lessonId: string, records: unknown[]) =>
    apiFetch(`/admin/lessons/${lessonId}/attendance`, {
      method: "POST",
      body: JSON.stringify({ records }),
    }),
  getAdminLessonAttendance: (lessonId: string) =>
    apiFetch<unknown[]>(`/admin/lessons/${lessonId}/attendance`),
  setScores: (lessonId: string, scores: unknown[]) =>
    apiFetch(`/admin/lessons/${lessonId}/scores`, {
      method: "POST",
      body: JSON.stringify({ scores }),
    }),
  getAdminLessonScores: (lessonId: string) =>
    apiFetch<unknown[]>(`/admin/lessons/${lessonId}/scores`),
  getAdminAssignments: (lessonId?: string) =>
    apiFetch<unknown[]>(`/admin/assignments${lessonId ? `?lesson_id=${lessonId}` : ""}`),
  createAssignment: (body: FormData) =>
    apiFetch("/admin/assignments", { method: "POST", body }),
  getSubmissions: (assignmentId: string) =>
    apiFetch<unknown[]>(`/admin/assignments/${assignmentId}/submissions`),
  getPendingSubmissions: () =>
    apiFetch<unknown[]>("/admin/submissions/pending"),
  reviewSubmission: (id: string, action: "approve" | "reject", score?: number, feedback?: string) =>
    apiFetch(`/admin/submissions/${id}/review`, {
      method: "POST",
      body: JSON.stringify({ action, score, feedback }),
    }),
  uploadIcon: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return apiFetch<{ url: string }>("/upload/icon", { method: "POST", body: fd });
  },
  getMeblahTypes: () => apiFetch<unknown[]>("/admin/meblah-types"),
  updateMeblahType: (id: string, body: Record<string, unknown>) =>
    apiFetch(`/admin/meblah-types/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  grantMeblah: (studentId: string, meblahTypeId: string) =>
    apiFetch(`/admin/students/${studentId}/meblahs`, {
      method: "POST",
      body: JSON.stringify({ meblah_type_id: meblahTypeId }),
    }),
  getLevels: () => apiFetch<unknown[]>("/admin/levels"),
  updateLevel: (id: string, body: Record<string, unknown>) =>
    apiFetch(`/admin/levels/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  grantPoints: (studentId: string, amount: number, description?: string) =>
    apiFetch("/admin/points/grant", {
      method: "POST",
      body: JSON.stringify({ student_id: studentId, amount, description }),
    }),
  getStudentsSummary: () => apiFetch<StudentSummary[]>("/admin/students/summary"),
  getStudentOverview: (studentId: string) => apiFetch<StudentOverview>(`/admin/students/${studentId}/overview`),
  removeStudentMeblah: (studentId: string, recordId: string) =>
    apiFetch(`/admin/students/${studentId}/meblahs/${recordId}`, { method: "DELETE" }),

  getForumGroups: () => apiFetch<ForumGroup[]>("/forum/groups"),
  getForumTags: () => apiFetch<ForumTag[]>("/forum/tags"),
  createForumTag: (label: string) =>
    apiFetch<ForumTag>("/forum/tags", { method: "POST", body: JSON.stringify({ label }) }),
  updateForumTag: (tagId: string, label: string) =>
    apiFetch<ForumTag>(`/forum/tags/${tagId}`, { method: "PUT", body: JSON.stringify({ label }) }),
  getForumTopics: (groupId: string | number) =>
    apiFetch<ForumTopic[]>(`/forum/groups/${normalizeGroupId(groupId)}/topics`),
  getForumQuota: () =>
    apiFetch<{ can_create: boolean; remaining_today: number | null; limit_per_day: number | null }>("/forum/quota"),
  getForumTopic: (id: string) => apiFetch<ForumTopicDetail>(`/forum/topics/${id}`),
  createForumTopic: (groupId: string | number, body: { title: string; body: string; tag_label?: string; tag_id?: string }) =>
    apiFetch<ForumTopic>(`/forum/groups/${normalizeGroupId(groupId)}/topics`, { method: "POST", body: JSON.stringify(body) }),
  updateForumTopic: (
    topicId: string,
    body: { title?: string; body?: string; tag_label?: string; tag_id?: string }
  ) => apiFetch<ForumTopicDetail>(`/forum/topics/${topicId}`, { method: "PUT", body: JSON.stringify(body) }),
  createForumComment: (topicId: string, body: string) =>
    apiFetch<ForumComment>(`/forum/topics/${topicId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    }),
  setForumReaction: (body: {
    target_type: "topic" | "comment";
    target_id: string;
    reaction: "like" | "dislike" | null;
  }) =>
    apiFetch<{ target_type: string; target_id: string; reactions: ForumReactions }>("/forum/reactions", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // Veli (parent)
  getParentChildren: () => apiFetch<GuardianLink[]>("/parent/children"),
  getParentOverview: (studentId: string) => apiFetch<StudentOverview>(`/parent/students/${studentId}/overview`),
  getParentPoints: (studentId: string) =>
    apiFetch<{ total_zerdalyum: number; recent_transactions: unknown[] }>(`/parent/students/${studentId}/points`),
  getParentLevel: (studentId: string) => apiFetch<StudentLevel>(`/parent/students/${studentId}/level`),
  getParentLeaderboard: (studentId: string) => apiFetch<ClassLeaderboard[]>(`/parent/students/${studentId}/leaderboard`),
  getParentAssignments: (studentId: string) => apiFetch<unknown[]>(`/parent/students/${studentId}/assignments`),
  getParentScores: (studentId: string) => apiFetch<unknown[]>(`/parent/students/${studentId}/scores`),
  getParentAttendance: (studentId: string) => apiFetch<unknown[]>(`/parent/students/${studentId}/attendance`),

  getStudentGuardians: (studentId: string) => apiFetch<GuardianLink[]>(`/admin/students/${studentId}/guardians`),
  addStudentGuardian: (studentId: string, guardianId: string) =>
    apiFetch(`/admin/students/${studentId}/guardians`, {
      method: "POST",
      body: JSON.stringify({ guardian_id: guardianId }),
    }),
  removeStudentGuardian: (studentId: string, guardianId: string) =>
    apiFetch(`/admin/students/${studentId}/guardians/${guardianId}`, { method: "DELETE" }),

  presenceHeartbeat: () => apiFetch<{ ok: boolean }>("/presence/heartbeat", { method: "POST" }),
  getOnlineUsers: () => apiFetch<OnlineUser[]>("/presence/online"),
};
