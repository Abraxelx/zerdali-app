"use client";

import Link from "next/link";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({ email: "", password: "", full_name: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Kayıt başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Logo size="lg" className="justify-center" />
          <p className="text-zinc-500 mt-3">Yeni hesap oluştur</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Ad Soyad" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          <Input label="Kullanıcı Adı" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          <Input label="E-posta" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          <Input label="Şifre" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Kayıt yapılıyor..." : "Kayıt Ol"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          Zaten hesabın var mı?{" "}
          <Link href="/login" className="text-amber-500 hover:underline">
            Giriş yap
          </Link>
        </p>
      </Card>
    </div>
  );
}
