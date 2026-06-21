import { ArrowRight, CheckCircle2, Clock, LucideIcon, Moon, Sun, Trophy, XCircle } from "lucide-react";
import { useTheme } from "@/lib/theme";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`glass rounded-2xl p-6 shadow-sm transition hover:shadow-lg ${className}`}>
      {children}
    </div>
  );
}

export function ThemeToggle() {
  const { toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Tema değiştir"
      title="Tema değiştir"
      className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-500/10 hover:text-amber-500"
    >
      <Moon size={18} className="dark:hidden" />
      <Sun size={18} className="hidden dark:block" />
    </button>
  );
}

export function StatusBadge({ status, isLate }: { status: string; isLate?: boolean }) {
  const config: Record<string, { label: string; cls: string; Icon: LucideIcon }> = {
    pending: { label: "Bekliyor", cls: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400", Icon: Clock },
    approved: { label: "Onaylandı", cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400", Icon: CheckCircle2 },
    rejected: { label: "Reddedildi", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400", Icon: XCircle },
  };
  const c = config[status] || config.pending;
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${c.cls}`}>
        <c.Icon size={13} /> {c.label}
      </span>
      {isLate && (
        <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-semibold text-orange-700 dark:bg-orange-950 dark:text-orange-400">
          Geç teslim
        </span>
      )}
    </span>
  );
}

export function IconBubble({ src, fallback, size = 40 }: { src?: string | null; fallback?: React.ReactNode; size?: number }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt="" width={size} height={size} className="rounded-lg object-cover" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-lg bg-gradient-to-br from-amber-100 to-amber-200 text-amber-600 dark:from-amber-950 dark:to-amber-900 dark:text-amber-400"
      style={{ width: size, height: size }}
    >
      {fallback}
    </div>
  );
}

/** Öğrenci profil fotoğrafı veya isim baş harfi. */
export function StudentAvatar({
  name,
  photoUrl,
  size = 36,
}: {
  name: string;
  photoUrl?: string | null;
  size?: number;
}) {
  return (
    <IconBubble
      src={photoUrl}
      size={size}
      fallback={<span className="text-xs font-semibold">{name?.charAt(0)?.toUpperCase() ?? "?"}</span>}
    />
  );
}

/** Avatar + isim + alt satır (username vb.) */
export function StudentRow({
  name,
  photoUrl,
  subtitle,
  size = 36,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  subtitle?: string;
  size?: number;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <StudentAvatar name={name} photoUrl={photoUrl} size={size} />
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{name}</p>
        {subtitle && <p className="text-xs text-zinc-500 truncate">{subtitle}</p>}
      </div>
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants = {
    primary: "bg-brand-gradient text-white shadow-sm hover:shadow-md hover:brightness-105",
    secondary: "bg-white/60 hover:bg-white/80 text-zinc-900 dark:bg-white/10 dark:hover:bg-white/20 dark:text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition active:scale-95 disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  return (
    <label className="block space-y-1">
      {label && <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>}
      <input
        className="w-full rounded-lg border border-zinc-300/70 bg-white/70 px-3 py-2 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-400/30 dark:border-zinc-700/70 dark:bg-zinc-900/50"
        {...props}
      />
    </label>
  );
}

export function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "amber",
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  color?: "amber" | "purple" | "blue" | "green";
}) {
  const colors = {
    amber: "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
    purple: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
    blue: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
    green: "bg-green-50 text-green-600 dark:bg-green-950 dark:text-green-400",
  };
  return (
    <Card className="animate-fade-in-up">
      <div className="flex items-start gap-4">
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-sm text-zinc-500">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}

export function RarityBadge({ rarity }: { rarity: string }) {
  const colors: Record<string, string> = {
    common: "bg-zinc-200 text-zinc-700",
    rare: "bg-blue-200 text-blue-800",
    epic: "bg-purple-200 text-purple-800",
    legendary: "bg-amber-200 text-amber-800",
    mythic: "bg-red-200 text-red-800",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${colors[rarity] || colors.common}`}>
      {rarity}
    </span>
  );
}

export function LevelProgress({
  current,
  next,
  power,
}: {
  current: { title: string; required_zerdalyum: number; icon_url?: string | null } | null;
  next: { title: string; required_zerdalyum: number; icon_url?: string | null } | null;
  power: number;
}) {
  if (!current) return null;
  const start = current.required_zerdalyum;
  const end = next?.required_zerdalyum ?? start;
  const progress = next ? Math.min(100, Math.max(0, ((power - start) / (end - start || 1)) * 100)) : 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <IconBubble src={current.icon_url} size={48} fallback={<Trophy size={24} />} />
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{current.title}</span>
            {next && (
              <span className="flex items-center gap-1 text-zinc-500">
                <ArrowRight size={14} /> {next.title}
              </span>
            )}
          </div>
          <p className="text-xs text-zinc-400">Mevcut seviye</p>
        </div>
        {next && <IconBubble src={next.icon_url} size={40} fallback={<Trophy size={20} />} />}
      </div>
      <div className="relative h-4 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500">
        {Math.round(power)} / {next ? next.required_zerdalyum : "MAX"} güç
        {next && <span className="ml-1 text-amber-500 font-medium">(%{Math.round(progress)})</span>}
      </p>
    </div>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="text-zinc-500 mt-1">{subtitle}</p>}
    </div>
  );
}

export function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
    </div>
  );
}
