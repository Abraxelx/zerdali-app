"use client";

import Link from "next/link";
import { useState } from "react";
import { Button, Card, Input } from "@/components/ui";
import { Logo } from "@/components/logo";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const res = await api.forgotPassword(email);
      setMessage(res.message);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "İstek gönderilemedi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-amber-50 to-zinc-100 dark:from-zinc-950 dark:to-zinc-900 p-4">
      <Card className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <Logo size="lg" className="justify-center" />
          <p className="text-zinc-500 mt-3 text-center">E-posta adresine şifre sıfırlama bağlantısı gönderelim</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="E-posta"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="ornek@email.com"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/login" className="text-amber-500 hover:underline">
            Giriş sayfasına dön
          </Link>
        </p>
      </Card>
    </div>
  );
}
