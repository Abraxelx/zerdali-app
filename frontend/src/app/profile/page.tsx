"use client";

import { useRef, useState } from "react";
import { Camera, User } from "lucide-react";
import { AppLayout, AuthGuard } from "@/components/layout";
import { Button, Card, IconBubble, Input, PageHeader } from "@/components/ui";
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
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

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

  const handlePhoto = async (file: File) => {
    setUploading(true);
    setMessage("");
    try {
      await api.uploadProfilePhoto(file);
      await refresh();
      setMessage("Profil fotoğrafı güncellendi");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Fotoğraf yüklenemedi");
    } finally {
      setUploading(false);
    }
  };

  return (
    <AuthGuard role="student">
      <AppLayout variant="student">
        <PageHeader title="Profil" subtitle="Profil bilgilerini düzenle" />
        <Card className="max-w-lg">
          <div className="mb-6 flex items-center gap-4">
            <div className="relative">
              <IconBubble src={user?.profile_photo_url} size={72} fallback={<User size={32} />} />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 rounded-full bg-amber-500 p-1.5 text-white shadow hover:bg-amber-600"
                title="Fotoğraf yükle"
              >
                <Camera size={14} />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handlePhoto(e.target.files[0])}
              />
            </div>
            <div>
              <p className="font-semibold text-lg">{user?.full_name}</p>
              <p className="text-sm text-zinc-500">@{user?.username}</p>
              {uploading && <p className="text-xs text-amber-500">Yükleniyor...</p>}
            </div>
          </div>

          <div className="space-y-4">
            <Input label="Ad Soyad" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input label="Kullanıcı Adı" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
            <label className="block space-y-1">
              <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Bio</span>
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
