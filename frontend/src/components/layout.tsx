"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";

const studentLinks = [
  { href: "/dashboard", label: "Panel" },
  { href: "/lessons", label: "Dersler" },
  { href: "/attendance", label: "Yoklama" },
  { href: "/scores", label: "Notlar" },
  { href: "/assignments", label: "Ödevler" },
  { href: "/profile", label: "Profil" },
];

const adminLinks = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/groups", label: "Gruplar" },
  { href: "/admin/lessons", label: "Dersler" },
  { href: "/admin/assignments", label: "Ödevler" },
  { href: "/admin/gamification", label: "Oyunlaştırma" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/points", label: "Puanlar" },
];

export function AppLayout({ children, variant }: { children: React.ReactNode; variant: "student" | "admin" }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const links = variant === "admin" ? adminLinks : studentLinks;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="sticky top-0 z-50 border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
          <Logo href={variant === "admin" ? "/admin" : "/dashboard"} size="sm" />
          <nav className="hidden md:flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  pathname === link.href
                    ? "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400"
                    : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-sm text-zinc-500">{user?.full_name}</span>
            <button onClick={logout} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
              <LogOut size={18} />
            </button>
            <button onClick={() => setMobileOpen(!mobileOpen)} className="md:hidden rounded-lg p-2">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="md:hidden border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8">{children}</main>
    </div>
  );
}

export function AuthGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "student" | "superadmin";
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-50 dark:bg-zinc-950">
        <Image src="/zerdali-logo.png" alt="Zerdali" width={48} height={48} className="object-contain" />
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") window.location.href = "/login";
    return null;
  }

  if (role && user.role !== role) {
    if (typeof window !== "undefined") window.location.href = user.role === "superadmin" ? "/admin" : "/dashboard";
    return null;
  }

  return <>{children}</>;
}
