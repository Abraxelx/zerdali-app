"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, Input, LoadingSpinner } from "@/components/ui";
import { Logo } from "@/components/logo";
import { establishRecoverySession } from "@/lib/auth-recovery";
import { getSupabaseBrowser } from "@/lib/supabase";

type PageState = "checking" | "ready" | "invalid";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pageState, setPageState] = useState<PageState>("checking");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const supabase = getSupabaseBrowser();

        const { data: subscription } = supabase.auth.onAuthStateChange((event) => {
          if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
            if (!cancelled) setPageState("ready");
          }
        });

        const ok = await establishRecoverySession(supabase);
        if (!cancelled) {
          setPageState(ok ? "ready" : "invalid");
        }

        return () => subscription.subscription.unsubscribe();
      } catch {
        if (!cancelled) setPageState("invalid");
      }
    }

    const cleanupPromise = init();
    return () => {
      cancelled = true;
      cleanupPromise.then((cleanup) => cleanup?.());
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Şifre en az 6 karakter olmalı");
      return;
    }
    if (password !== confirm) {
      setError("Şifreler eşleşmiyor");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseBrowser();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) throw updateError;
      await supabase.auth.signOut();
      router.push("/login?reset=success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Şifre güncellenemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Logo size="lg" className="justify-center" />
          <p className="text-zinc-500 mt-3">Yeni şifreni belirle</p>
        </div>

        {pageState === "checking" && (
          <div className="py-6">
            <LoadingSpinner />
            <p className="text-center text-sm text-zinc-500 mt-4">Bağlantı doğrulanıyor...</p>
          </div>
        )}

        {pageState === "invalid" && (
          <div className="text-center space-y-3">
            <p className="text-sm text-zinc-500">
              Geçersiz veya süresi dolmuş bağlantı. Lütfen yeni bir sıfırlama maili iste.
            </p>
            <p className="text-xs text-zinc-400">
              Maildeki linki doğrudan tarayıcıda açtığından emin ol (gmail uygulaması içi tarayıcı bazen sorun çıkarır).
            </p>
            <Link href="/forgot-password" className="text-sm text-amber-500 hover:underline">
              Şifremi unuttum
            </Link>
          </div>
        )}

        {pageState === "ready" && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Yeni şifre"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
            <Input
              label="Yeni şifre (tekrar)"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={6}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Kaydediliyor..." : "Şifreyi Güncelle"}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-amber-500 hover:underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </Card>
    </div>
  );
}
