import type { ElementType, ReactNode } from "react";

const ACCENTS = {
  green:  { badge: "bg-green-400/10 ring-green-400/30 halo-green",   icon: "text-green-400" },
  blue:   { badge: "bg-blue-400/10 ring-blue-400/30 halo-blue",     icon: "text-blue-400" },
  amber:  { badge: "bg-amber-400/10 ring-amber-400/30 halo-amber",   icon: "text-amber-400" },
  purple: { badge: "bg-purple-400/10 ring-purple-400/30 halo-purple", icon: "text-purple-400" },
} as const;

export type Accent = keyof typeof ACCENTS;

/** Consistent page heading: accent icon badge + display title, optional subtitle and right slot. */
export function PageTitle({
  title, subtitle, icon: Icon, accent = "green", right,
}: {
  title: string;
  subtitle?: string;
  icon?: ElementType;
  accent?: Accent;
  right?: ReactNode;
}) {
  const a = ACCENTS[accent];
  return (
    <header className="animate-rise mb-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <span className={`grid place-items-center w-10 h-10 rounded-2xl ring-1 shrink-0 ${a.badge}`}>
              <Icon size={20} className={a.icon} strokeWidth={2} />
            </span>
          )}
          <h1 className="font-display text-2xl font-extrabold tracking-tight text-white truncate">{title}</h1>
        </div>
        {right && <div className="shrink-0">{right}</div>}
      </div>
      {subtitle && <p className="text-sm text-slate-400 mt-2.5 leading-snug">{subtitle}</p>}
    </header>
  );
}

/** Small pill for counters like "3/8 apostados". */
export function StatPill({ children, tone = "slate" }: { children: ReactNode; tone?: "slate" | "green" }) {
  const tones = {
    slate: "text-slate-300 bg-white/[0.04] border-white/10",
    green: "text-green-300 bg-green-400/10 border-green-400/25",
  };
  return (
    <span className={`inline-flex items-center text-xs font-semibold rounded-full border px-3 py-1.5 ${tones[tone]}`}>
      {children}
    </span>
  );
}
