"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Users } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Card, LoadingSpinner, PageHeader, StudentRow } from "@/components/ui";
import { api, ClassmateList } from "@/lib/api";

export default function ClassmatesPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["classmates"],
    queryFn: () => api.getClassmates(),
  });

  const list = data as ClassmateList | undefined;

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader
          title="Sınıf Arkadaşları"
          subtitle="Aynı gruptaki öğrencilerin profillerini ve biosunu görüntüle"
        />

        {isLoading ? (
          <LoadingSpinner />
        ) : !list?.groups.length ? (
          <Card>
            <p className="text-sm text-zinc-500 text-center py-8">
              Henüz bir sınıfa kayıtlı değilsin veya grupta başka öğrenci yok.
            </p>
          </Card>
        ) : (
          <div className="space-y-6">
            {list.groups.map((group) => (
              <Card key={group.group_id}>
                <h2 className="font-semibold flex items-center gap-2 mb-4">
                  <Users size={18} className="text-amber-500" />
                  {group.group_name}
                </h2>
                {group.classmates.length === 0 ? (
                  <p className="text-sm text-zinc-500">Bu grupta başka öğrenci yok.</p>
                ) : (
                  <ul className="space-y-2">
                    {group.classmates.map((mate) => (
                      <li key={mate.id}>
                        <Link
                          href={`/students/${mate.id}`}
                          className="flex items-center gap-3 rounded-xl px-3 py-3 bg-zinc-50 hover:bg-amber-500/10 dark:bg-zinc-800/50 dark:hover:bg-amber-500/10 transition"
                        >
                          <StudentRow
                            name={mate.full_name}
                            photoUrl={mate.profile_photo_url}
                            subtitle={
                              mate.bio
                                ? mate.bio.length > 80
                                  ? `${mate.bio.slice(0, 80)}…`
                                  : mate.bio
                                : `@${mate.username} · Bio yok`
                            }
                            size={44}
                            className="flex-1 min-w-0"
                          />
                          <ChevronRight size={18} className="shrink-0 text-zinc-400" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            ))}
          </div>
        )}
      </AppLayout>
    </AuthGuard>
  );
}
