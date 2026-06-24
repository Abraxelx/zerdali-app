"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  MessageSquare,
  Sparkles,
  User,
  UserCircle,
  Users,
  X,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { roleHomePath } from "@/lib/api";
import { NotificationBell } from "@/lib/notifications";

type NavLink = { href: string; label: string; icon: LucideIcon };

type NavEntry =
  | { kind: "link"; href: string; label: string; icon: LucideIcon }
  | { kind: "menu"; label: string; icon: LucideIcon; items: NavLink[] };

const studentNav: NavEntry[] = [
  { kind: "link", href: "/dashboard", label: "Panel", icon: LayoutDashboard },
  {
    kind: "menu",
    label: "Eğitim",
    icon: GraduationCap,
    items: [
      { href: "/lessons", label: "Dersler", icon: BookOpen },
      { href: "/attendance", label: "Yoklama", icon: ClipboardCheck },
      { href: "/scores", label: "Notlar", icon: FileText },
      { href: "/assignments", label: "Ödevler", icon: ClipboardList },
    ],
  },
  { kind: "link", href: "/forum", label: "Forum", icon: MessageSquare },
  { kind: "link", href: "/profile", label: "Profil", icon: User },
];

const adminNav: NavEntry[] = [
  { kind: "link", href: "/admin", label: "Panel", icon: LayoutDashboard },
  {
    kind: "menu",
    label: "Eğitim",
    icon: GraduationCap,
    items: [
      { href: "/admin/groups", label: "Gruplar", icon: Users },
      { href: "/admin/lessons", label: "Dersler", icon: BookOpen },
      { href: "/admin/assignments", label: "Ödevler", icon: ClipboardList },
      { href: "/admin/approvals", label: "Ödev Onay", icon: CheckCircle2 },
    ],
  },
  {
    kind: "menu",
    label: "Öğrenciler",
    icon: UserCircle,
    items: [
      { href: "/admin/students", label: "Öğrenci Listesi", icon: GraduationCap },
      { href: "/admin/users", label: "Kullanıcılar", icon: Users },
      { href: "/admin/points", label: "Puan Ver", icon: Zap },
      { href: "/admin/activity", label: "Giriş Kayıtları", icon: LogIn },
    ],
  },
  { kind: "link", href: "/admin/gamification", label: "Oyun", icon: Sparkles },
  { kind: "link", href: "/forum", label: "Forum", icon: MessageSquare },
];

const parentNav: NavEntry[] = [
  { kind: "link", href: "/parent", label: "Panel", icon: LayoutDashboard },
  {
    kind: "menu",
    label: "Eğitim",
    icon: GraduationCap,
    items: [
      { href: "/parent/scores", label: "Notlar", icon: FileText },
      { href: "/parent/assignments", label: "Ödevler", icon: ClipboardList },
      { href: "/parent/attendance", label: "Yoklama", icon: ClipboardCheck },
    ],
  },
  { kind: "link", href: "/parent/forum", label: "Forum", icon: MessageSquare },
  { kind: "link", href: "/parent/profile", label: "Profil", icon: User },
];

function isPathActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/dashboard" || href === "/parent") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isMenuActive(pathname: string, items: NavLink[]) {
  return items.some((item) => isPathActive(pathname, item.href));
}

function navItemClass(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium whitespace-nowrap transition ${
    active
      ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
      : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
  }`;
}

function NavIcon({ icon: Icon, size = 16 }: { icon: LucideIcon; size?: number }) {
  return <Icon size={size} className="shrink-0 opacity-90" aria-hidden />;
}

function NavLabel({ icon, label }: { icon: LucideIcon; label: string }) {
  return (
    <>
      <NavIcon icon={icon} />
      <span>{label}</span>
    </>
  );
}

function NavDropdown({
  label,
  icon,
  items,
  pathname,
  onNavigate,
}: {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = isMenuActive(pathname, items);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={navItemClass(active)}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <NavLabel icon={icon} label={label} />
        <ChevronDown size={14} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+4px)] z-[60] min-w-[12rem] rounded-xl border border-white/50 bg-white/95 py-1 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95">
          {items.map((item) => {
            const itemActive = isPathActive(pathname, item.href);
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => {
                  setOpen(false);
                  onNavigate?.();
                }}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm transition ${
                  itemActive
                    ? "bg-amber-500/10 font-medium text-amber-600 dark:text-amber-400"
                    : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                }`}
              >
                <ItemIcon size={16} className="shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DesktopNav({ entries, pathname }: { entries: NavEntry[]; pathname: string }) {
  return (
    <nav className="hidden min-w-0 flex-1 items-center justify-center gap-0.5 lg:flex" aria-label="Ana menü">
      {entries.map((entry) =>
        entry.kind === "link" ? (
          <Link
            key={entry.href}
            href={entry.href}
            className={navItemClass(isPathActive(pathname, entry.href))}
          >
            <NavLabel icon={entry.icon} label={entry.label} />
          </Link>
        ) : (
          <NavDropdown
            key={entry.label}
            label={entry.label}
            icon={entry.icon}
            items={entry.items}
            pathname={pathname}
          />
        )
      )}
    </nav>
  );
}

function MobileNavGroup({
  label,
  icon,
  items,
  pathname,
  onClose,
  defaultOpen,
}: {
  label: string;
  icon: LucideIcon;
  items: NavLink[];
  pathname: string;
  onClose: () => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen ?? false);
  const active = isMenuActive(pathname, items);

  return (
    <div className="rounded-xl border border-zinc-500/10 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium transition ${
          active ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" : "text-zinc-700 dark:text-zinc-200"
        }`}
      >
        <span className="flex items-center gap-2.5">
          <NavIcon icon={icon} size={18} />
          {label}
        </span>
        <ChevronDown size={16} className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="border-t border-zinc-500/10 bg-zinc-500/5 px-1 py-1 dark:bg-white/5">
          {items.map((item) => {
            const ItemIcon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                  isPathActive(pathname, item.href)
                    ? "bg-amber-500/15 font-medium text-amber-600 dark:text-amber-400"
                    : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
                }`}
              >
                <ItemIcon size={16} className="shrink-0 opacity-80" aria-hidden />
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MobileNav({
  entries,
  pathname,
  onClose,
  extraLinks,
}: {
  entries: NavEntry[];
  pathname: string;
  onClose: () => void;
  extraLinks?: NavLink[];
}) {
  return (
    <nav className="space-y-1.5 p-3 sm:p-4" aria-label="Mobil menü">
      {entries.map((entry) =>
        entry.kind === "link" ? (
          <Link
            key={entry.href}
            href={entry.href}
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isPathActive(pathname, entry.href)
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
            }`}
          >
            <NavIcon icon={entry.icon} size={18} />
            {entry.label}
          </Link>
        ) : (
          <MobileNavGroup
            key={entry.label}
            label={entry.label}
            icon={entry.icon}
            items={entry.items}
            pathname={pathname}
            onClose={onClose}
            defaultOpen={isMenuActive(pathname, entry.items)}
          />
        )
      )}
      {extraLinks?.map((link) => {
        const LinkIcon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            onClick={onClose}
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
              isPathActive(pathname, link.href)
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "text-zinc-600 hover:bg-zinc-500/10 dark:text-zinc-300"
            }`}
          >
            <LinkIcon size={18} className="shrink-0 opacity-90" aria-hidden />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AppLayout({ children, variant }: { children: React.ReactNode; variant: "student" | "admin" | "parent" }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const entries = variant === "admin" ? adminNav : variant === "parent" ? parentNav : studentNav;
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = variant === "admin";
  const isParent = variant === "parent";
  const homeHref = isAdmin ? "/admin" : isParent ? "/parent" : "/dashboard";

  const adminExtraMobileLinks: NavLink[] = [
    { href: "/admin/profile", label: "Öğretmen Profili", icon: UserCircle },
  ];

  const profileHref = isAdmin ? "/admin/profile" : isParent ? "/parent/profile" : undefined;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <div className="min-h-screen overflow-x-hidden">
      <header className="glass-strong sticky top-0 z-50 border-b border-white/40 dark:border-white/10">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:h-16 sm:px-4 lg:px-6">
          <div className="shrink-0">
            <Logo href={homeHref} size="sm" />
          </div>

          <DesktopNav entries={entries} pathname={pathname} />

          <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
            <ThemeToggle />
            <NotificationBell />

            {profileHref ? (
              <Link
                href={profileHref}
                title="Profil"
                className="hidden rounded-lg p-0.5 transition hover:bg-zinc-500/10 lg:block"
              >
                {user?.profile_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.profile_photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                    {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                )}
              </Link>
            ) : user?.profile_photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.profile_photo_url} alt="" className="hidden h-8 w-8 rounded-full object-cover lg:block" />
            ) : (
              <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-amber-100 text-xs font-semibold text-amber-600 dark:bg-amber-950 dark:text-amber-400 lg:flex">
                {user?.full_name?.charAt(0)?.toUpperCase() ?? "?"}
              </div>
            )}

            <span className="hidden max-w-[7rem] truncate text-sm text-zinc-500 xl:block xl:max-w-[9rem]">
              {user?.full_name}
            </span>

            <button
              onClick={logout}
              className="hidden rounded-lg p-2 text-zinc-500 hover:bg-zinc-500/10 hover:text-red-500 sm:block"
              aria-label="Çıkış yap"
            >
              <LogOut size={18} />
            </button>

            <button
              onClick={() => setMobileOpen((open) => !open)}
              className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-500/10 lg:hidden"
              aria-label={mobileOpen ? "Menüyü kapat" : "Menüyü aç"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {mobileOpen && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[45] bg-black/40 backdrop-blur-[1px] lg:hidden"
            aria-label="Menüyü kapat"
            onClick={() => setMobileOpen(false)}
          />
          <div className="fixed left-0 right-0 top-14 z-[46] max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-white/30 bg-white/95 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-950/95 sm:top-16 sm:max-h-[calc(100dvh-4rem)] lg:hidden">
            <MobileNav
              entries={entries}
              pathname={pathname}
              onClose={() => setMobileOpen(false)}
              extraLinks={isAdmin ? adminExtraMobileLinks : undefined}
            />
            <div className="border-t border-zinc-500/10 px-3 py-3 sm:px-4 sm:hidden">
              <button
                onClick={() => {
                  setMobileOpen(false);
                  logout();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-500/10 px-3 py-2.5 text-sm font-medium text-red-500"
              >
                <LogOut size={16} />
                Çıkış yap
              </button>
            </div>
          </div>
        </>
      )}

      <main className="mx-auto max-w-7xl px-3 py-6 sm:px-4 sm:py-8 lg:px-6">{children}</main>
    </div>
  );
}

export function AuthGuard({
  children,
  role,
}: {
  children: React.ReactNode;
  role?: "student" | "superadmin" | "veli";
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
    if (typeof window !== "undefined") window.location.href = roleHomePath(user.role);
    return null;
  }

  return <>{children}</>;
}
