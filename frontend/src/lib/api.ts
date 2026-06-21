const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

import { ApiError, friendlyApiMessage } from "./messages";
export { ApiError, friendlyApiMessage };

export type Profile = {
  id: string;
  email: string;
  full_name: string;
  username: string;
  role: "student" | "superadmin";
  profile_photo_url?: string;
  bio?: string;
};

export type GroupMember = {
  student_id: string;
  joined_at?: string;
  profiles?: Pick<Profile, "id" | "full_name" | "username" | "email"> | null;
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
};
