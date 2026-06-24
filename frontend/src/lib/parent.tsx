"use client";

import { useQuery } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState } from "react";
import { api, GuardianLink, Profile } from "./api";

type ParentContextType = {
  children: GuardianLink[];
  selectedId: string | null;
  setSelectedId: (id: string) => void;
  selectedProfile: Profile | null | undefined;
  loading: boolean;
};

const ParentContext = createContext<ParentContextType | null>(null);
const STORAGE_KEY = "zerdali_parent_student";

export function ParentProvider({ children }: { children: React.ReactNode }) {
  const { data, isLoading } = useQuery({
    queryKey: ["parent-children"],
    queryFn: api.getParentChildren,
  });
  const [selectedId, setSelectedIdState] = useState<string | null>(null);

  const links = data ?? [];

  useEffect(() => {
    if (!links.length) {
      setSelectedIdState(null);
      return;
    }
    const stored = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const valid = stored && links.some((l) => l.student_id === stored);
    setSelectedIdState(valid ? stored : links[0].student_id);
  }, [links]);

  const setSelectedId = (id: string) => {
    setSelectedIdState(id);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, id);
  };

  const selectedProfile = links.find((l) => l.student_id === selectedId)?.profile;

  return (
    <ParentContext.Provider
      value={{
        children: links,
        selectedId,
        setSelectedId,
        selectedProfile,
        loading: isLoading,
      }}
    >
      {children}
    </ParentContext.Provider>
  );
}

export function useParentStudent() {
  const ctx = useContext(ParentContext);
  if (!ctx) throw new Error("useParentStudent must be used within ParentProvider");
  return ctx;
}

export function ParentStudentPicker() {
  const { children, selectedId, setSelectedId, loading } = useParentStudent();

  if (loading) return null;
  if (!children.length) {
    return (
      <CardNotice>
        Henüz bir öğrenci ile eşleştirilmedin. Okul yöneticisinden veli ataması iste.
      </CardNotice>
    );
  }

  return (
    <div className="mb-6">
      <label className="block space-y-1">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Öğrenci seç</span>
        <select
          className="w-full max-w-md rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value)}
        >
          {children.map((c) => (
            <option key={c.student_id} value={c.student_id}>
              {c.profile?.full_name ?? c.student_id}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

function CardNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-6 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
      {children}
    </div>
  );
}

export function ParentRequireStudent({ children }: { children: React.ReactNode }) {
  const { selectedId, loading, children: links } = useParentStudent();
  if (loading) return null;
  if (!links.length) return <ParentStudentPicker />;
  if (!selectedId) return <ParentStudentPicker />;
  return <>{children}</>;
}
