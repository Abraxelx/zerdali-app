import { LucideIcon } from "lucide-react";

export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${className}`}>
      {children}
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
    primary: "bg-amber-500 hover:bg-amber-600 text-white",
    secondary: "bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-white",
    danger: "bg-red-500 hover:bg-red-600 text-white",
  };
  return (
    <button
      className={`rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${variants[variant]} ${className}`}
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
        className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
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
    <Card>
      <div className="flex items-start gap-4">
        <div className={`rounded-lg p-3 ${colors[color]}`}>
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
  current: { title: string; required_zerdalyum: number } | null;
  next: { title: string; required_zerdalyum: number } | null;
  power: number;
}) {
  if (!current) return null;
  const start = current.required_zerdalyum;
  const end = next?.required_zerdalyum ?? start;
  const progress = next ? Math.min(100, ((power - start) / (end - start)) * 100) : 100;

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{current.title}</span>
        {next && <span className="text-zinc-500">→ {next.title}</span>}
      </div>
      <div className="h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="text-xs text-zinc-500">
        {Math.round(power)} / {next ? next.required_zerdalyum : "MAX"} güç
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
