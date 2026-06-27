"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AppLayout, AuthGuard } from "@/components/layout";
import { ClassmateProfileView } from "@/components/classmate-profile";
import { Card, LoadingSpinner, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";

export default function StudentPublicProfilePage() {
  const params = useParams();
  const id = params.id as string;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["classmate-profile", id],
    queryFn: () => api.getClassmateProfile(id),
  });

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Öğrenci Profili" subtitle="Sınıf arkadaşının profili" />
        {isLoading ? (
          <LoadingSpinner />
        ) : isError ? (
          <Card>
            <p className="text-sm text-zinc-500 text-center py-8">Bu profile erişemiyorsun veya profil bulunamadı.</p>
            <p className="text-center">
              <Link href="/classmates" className="text-sm text-amber-600 hover:underline dark:text-amber-400">
                Sınıf arkadaşlarına dön
              </Link>
            </p>
          </Card>
        ) : data ? (
          <ClassmateProfileView data={data} />
        ) : null}
      </AppLayout>
    </AuthGuard>
  );
}
