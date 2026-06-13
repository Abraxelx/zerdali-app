"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/logo";

function LoginForm() {
  const searchParams = useSearchParams();
  const resetSuccess = searchParams.get("reset") === "success";
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <div className="mb-6 flex flex-col items-center">
        <Logo size="lg" className="justify-center" />
        <p className="text-zinc-500 mt-3">Zerdalyum platformuna giriş yap</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {resetSuccess && (
          <p className="text-sm text-green-600 bg-green-50 dark:bg-green-950/30 rounded-lg px-3 py-2">
            Şifren güncellendi. Yeni şifrenle giriş yapabilirsin.
          </p>
        )}
        <Input label="E-posta" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <div>
          <Input label="Şifre" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <div className="mt-1 text-right">
            <Link href="/forgot-password" className="text-xs text-amber-500 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
        </Button>
      </form>
      <p className="mt-4 text-center text-sm text-zinc-500">
        Hesabın yok mu?{" "}
        <Link href="/register" className="text-amber-500 hover:underline">
          Kayıt ol
        </Link>
      </p>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Suspense fallback={<div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
