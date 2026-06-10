"use client";

import { useState } from "react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, Input, PageHeader } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";

export default function ProfilePage() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({
    full_name: user?.full_name || "",
    username: user?.username || "",
    bio: user?.bio || "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setMessage("");
    try {
      await api.updateProfile(form);
      await refresh();
      setMessage("Profil güncellendi");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Güncelleme başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Profil" subtitle="Profil bilgilerini düzenle" />
        <Card className="max-w-lg">
          <div className="space-y-4">
            <Input label="Ad Soyad" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Kullanıcı Adı" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-600">Bio</span>
              <textarea
                className="w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-sm"
                rows={3}
                value={form.bio}
                onChange={(e) => setForm({ ...form, bio: e.target.value })}
              />
            </label>
            <p className="text-sm text-zinc-500">E-posta: {user?.email}</p>
            {message && <p className="text-sm text-amber-500">{message}</p>}
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </div>
        </Card>
      </AppLayout>
    </AuthGuard>
  );
}
