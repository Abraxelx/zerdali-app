"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { NotificationBell } from "@/lib/notifications";

type NavLink = {
  href: string;
  label: string;
  shortLabel?: string;
};

const studentLinks: NavLink[] = [
  { href: "/dashboard", label: "Panel" },
  { href: "/lessons", label: "Dersler" },
  { href: "/attendance", label: "Yoklama" },
  { href: "/scores", label: "Notlar" },
  { href: "/assignments", label: "Ödevler" },
  { href: "/forum", label: "Forum" },
  { href: "/profile", label: "Profil" },
];

const adminLinks: NavLink[] = [
  { href: "/admin", label: "Panel" },
  { href: "/admin/groups", label: "Gruplar" },
  { href: "/admin/lessons", label: "Dersler" },
  { href: "/admin/assignments", label: "Ödevler" },
  { href: "/admin/approvals", label: "Ödev Onay" },
  { href: "/forum", label: "Forum" },
  { href: "/admin/gamification", label: "Oyunlaştırma", shortLabel: "Oyun" },
  { href: "/admin/students", label: "Öğrenciler" },
  { href: "/admin/users", label: "Kullanıcılar" },
  { href: "/admin/activity", label: "Giriş Kayıtları", shortLabel: "Girişler" },
  { href: "/admin/points", label: "Puanlar" },
];

function navLinkClass(active: boolean) {
  return `shrink-0 rounded-lg px-2.5 py-2 text-sm font-medium whitespace-nowrap transition ${
    active
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
  }`;
}

export function AppLayout({ children, variant }: { children: React.ReactNode; variant: "student" | "admin" }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const links = variant === "admin" ? adminLinks : studentLinks;
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = variant === "admin";

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const desktopNavClass = isAdmin
    ? "hidden xl:flex min-w-0 flex-1 items-center justify-center gap-0.5 overflow-x-auto px-1 scrollbar-hide"
    : "hidden lg:flex min-w-0 flex-1 items-center justify-center gap-1 flex-wrap px-2";

  const mobileToggleClass = isAdmin ? "xl:hidden" : "lg:hidden";
  const mobileNavClass = isAdmin ? "xl:hidden" : "lg:hidden";

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/40 dark:border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <div className="shrink-0">
            <Logo href={variant === "admin" ? "/admin" : "/dashboard"} size="sm" />
          </div>

          <nav className={desktopNavClass} aria-label="Ana menü">
            {links.map((link) => {
              const active = pathname === link.href;
              const text = isAdmin ? (link.shortLabel ?? link.label) : link.label;
              return (
                <Link key={link.href} href={link.href} className={navLinkClass(active)} title={link.label}>
                  {text}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
            <ThemeToggle />
            <NotificationBell />
            {user?.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="hidden max-w-[8rem] truncate text-sm text-zinc-500 md:block lg:max-w-[10rem]">
              {user?.full_name}
            </span>
            <button
              onClick={logout}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-500/10 hover:text-red-500"
              aria-label="Çıkış yap"
            >
              <LogOut size={18} />
            </button>
            <button
              onClick={() => setMobileOpen((open) => !open)}
              className={`rounded-lg p-2 text-zinc-500 hover:bg-zinc-500/10 ${mobileToggleClass}`}
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <nav
            className={`${mobileNavClass} max-h-[calc(100dvh-4rem)] overflow-y-auto border-t border-white/30 p-3 sm:p-4 dark:border-white/10`}
            aria-label="Mobil menü"
          >
            <div className="mx-auto max-w-7xl space-y-1">
              {links.map((link) => {
                const active = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </nav>
        )}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Image src="/zerdali-logo.png" alt="Zerdali" width={48} height={48} className="object-contain animate-float" />
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
