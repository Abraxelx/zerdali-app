"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearToken, Profile, setToken } from "./api";

type AuthContextType = {
  user: Profile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; username: string }) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const refresh = useCallback(async () => {
    try {
      const profile = await api.me();
      setUser(profile);
    } catch {
      setUser(null);
      clearToken();
    }
  }, []);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("zerdali_token") : null;
    if (token) {
      refresh().finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [refresh]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    setToken(res.access_token);
    const profile = await api.me();
    setUser(profile);
    router.push(profile.role === "superadmin" ? "/admin" : "/dashboard");
  };

  const register = async (data: { email: string; password: string; full_name: string; username: string }) => {
    const res = await api.register(data);
    if (res.access_token) {
      setToken(res.access_token);
      const profile = await api.me();
      setUser(profile);
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  };

  const logout = () => {
    clearToken();
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
