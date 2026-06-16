import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { Countdown } from "@/components/Countdown";
import { FlagCircle } from "@/components/FlagCircle";
import { getApprovedModules } from "@/lib/module-access";
import Link from "next/link";
import {
  LayoutGrid, CalendarDays, Trophy, Star, ArrowRight, BarChart3,
  Target, Gift,
} from "lucide-react";

const MODULES = [
  {
    href: "/grupos",
    icon: LayoutGrid,
    title: "Fase de Grupos",
    description: "Predice el 1°, 2°, 3° y 4° de cada grupo.",
    grad: "from-green-500/[0.14] to-green-500/[0.02]",
    border: "border-green-500/20",
    tint: "text-green-400",
    badge: "bg-green-400/10 ring-green-400/30 halo-green",
    arrow: "bg-green-400/12 ring-green-400/30 text-green-300",
  },
  {
    href: "/partidos",
    icon: CalendarDays,
    title: "Partidos",
    description: "Apuesta por el resultado de cada partido.",
    grad: "from-blue-500/[0.14] to-blue-500/[0.02]",
    border: "border-blue-500/20",
    tint: "text-blue-400",
    badge: "bg-blue-400/10 ring-blue-400/30 halo-blue",
    arrow: "bg-blue-400/12 ring-blue-400/30 text-blue-300",
  },
  {
    href: "/bracket",
    icon: Trophy,
    title: "Bracket",
    description: "Llena el bracket completo desde 32vos hasta el campeón.",
    grad: "from-amber-500/[0.14] to-amber-500/[0.02]",
    border: "border-amber-500/20",
    tint: "text-amber-400",
    badge: "bg-amber-400/10 ring-amber-400/30 halo-amber",
    arrow: "bg-amber-400/12 ring-amber-400/30 text-amber-300",
  },
  {
    href: "/especiales",
    icon: Star,
    title: "Premios Especiales",
    description: "Goleador, Jugador del torneo, Mejor portero y Mejor joven.",
    grad: "from-purple-500/[0.14] to-purple-500/[0.02]",
    border: "border-purple-500/20",
    tint: "text-purple-400",
    badge: "bg-purple-400/10 ring-purple-400/30 halo-purple",
    arrow: "bg-purple-400/12 ring-purple-400/30 text-purple-300",
  },
];

const STEPS = [
  { n: 1, icon: Target, label: "Haz tus predicciones", tint: "text-green-400", badge: "bg-green-400/10 ring-green-400/30" },
  { n: 2, icon: Trophy, label: "Acumula puntos", tint: "text-blue-400", badge: "bg-blue-400/10 ring-blue-400/30" },
  { n: 3, icon: BarChart3, label: "Compite en la tabla", tint: "text-amber-400", badge: "bg-amber-400/10 ring-amber-400/30" },
  { n: 4, icon: Gift, label: "Gana premios", tint: "text-purple-400", badge: "bg-purple-400/10 ring-purple-400/30" },
];

/** Faint bracket graphic that lives on the right edge of a module card. */
function BracketDecor({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={`absolute -right-2 top-1/2 -translate-y-1/2 w-36 h-36 opacity-[0.12] ${className}`}
      fill="none"
      aria-hidden
    >
      {[0, 1, 2, 3].map((r) => (
        <rect key={`a${r}`} x="6" y={10 + r * 28} width="34" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      ))}
      {[0, 1].map((r) => (
        <rect key={`b${r}`} x="52" y={24 + r * 44} width="34" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      ))}
      <rect x="92" y="46" width="22" height="18" rx="5" stroke="currentColor" strokeWidth="2" />
      <path d="M40 19 H52 M40 47 H52 M40 75 H52 M40 103 H52 M86 33 H92 M86 77 H92" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;

  // Next upcoming match
  const nextMatch = await prisma.match.findFirst({
    where: { scheduledAt: { gt: new Date() } },
    orderBy: { scheduledAt: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });

  // User quick stats
  const [matchBetsCorrect, groupBetsCorrect, specialBetsCorrect, bracketBet, validModules] = await Promise.all([
    prisma.matchBet.findMany({ where: { userId, isCorrect: true }, select: { paymentId: true, poolModule: true, payment: { select: { status: true } } } }),
    prisma.groupBet.count({ where: { userId, isCorrect: true } }),
    prisma.specialBet.count({ where: { userId, isCorrect: true } }),
    prisma.bracketBet.findFirst({ where: { userId }, select: { score: true } }),
    getApprovedModules(userId),
  ]);

  // Partidos: individuales cuentan por su propio pago; los demás por la entrada de su bolsa.
  const matchPts = matchBetsCorrect.filter((b) =>
    b.paymentId ? b.payment?.status === "APPROVED" : validModules.has(b.poolModule ?? "MATCHES")
  ).length;

  const totalPts =
    matchPts +
    (validModules.has("GROUPS") ? groupBetsCorrect : 0) +
    (validModules.has("SPECIALS") ? specialBetsCorrect : 0) +
    (validModules.has("BRACKET") ? (bracketBet?.score ?? 0) : 0);

  const homeName = nextMatch?.homeTeam?.name ?? nextMatch?.homeLabel ?? "Por definir";
  const awayName = nextMatch?.awayTeam?.name ?? nextMatch?.awayLabel ?? "Por definir";

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-4">
        {/* ── Próximo partido (hero) ───────────────────────────────── */}
        {nextMatch && (
          <section className="animate-rise relative rounded-3xl overflow-hidden border border-white/10 stadium-bg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
            <div className="absolute inset-0 stadium-lines" />
            <div className="relative p-5 sm:p-6">
              <p className="text-[11px] font-bold text-green-400 uppercase tracking-[0.22em] mb-5">
                Próximo partido
              </p>

              {/* Teams row */}
              <div className="flex items-center justify-between gap-2 mb-5">
                <div className="flex flex-col items-center gap-2 w-[80px] shrink-0">
                  <FlagCircle
                    flag={nextMatch.homeTeam?.flag}
                    code={nextMatch.homeTeam?.code}
                    size={62}
                    ring="ring-green-400/40"
                  />
                  <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
                    {homeName}
                  </span>
                </div>

                <span className="grid place-items-center w-11 h-11 rounded-full bg-[#0b1424] ring-1 ring-green-400/60 animate-halo-pulse shrink-0">
                  <span className="font-display font-extrabold text-xs text-green-400 tracking-wide">VS</span>
                </span>

                <div className="flex flex-col items-center gap-2 w-[80px] shrink-0">
                  <FlagCircle
                    flag={nextMatch.awayTeam?.flag}
                    code={nextMatch.awayTeam?.code}
                    size={62}
                    ring="ring-blue-400/40"
                  />
                  <span className="text-xs font-bold text-white text-center leading-tight line-clamp-2">
                    {awayName}
                  </span>
                </div>
              </div>

              {/* Countdown row — full width */}
              <div className="flex justify-center">
                <Countdown target={nextMatch.scheduledAt.toISOString()} />
              </div>
            </div>
          </section>
        )}

        {/* ── Mis puntos ───────────────────────────────────────────── */}
        <section
          className="animate-rise flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"
          style={{ animationDelay: "80ms" }}
        >
          <div className="flex items-center gap-4">
            <span className="grid place-items-center w-12 h-12 rounded-full bg-green-400/10 ring-1 ring-green-400/30 halo-green">
              <Star size={22} className="text-green-400" strokeWidth={2} />
            </span>
            <div>
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-[0.16em]">Mis puntos</p>
              <p className="font-display text-4xl font-extrabold text-white leading-none mt-1 tabular-nums">{totalPts}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm font-semibold text-slate-200 border border-white/12 bg-white/[0.03] rounded-full pl-4 pr-3 py-2.5 hover:bg-white/[0.07] hover:border-white/20 transition-colors"
          >
            <BarChart3 size={15} className="text-green-400" />
            Ver tabla
            <ArrowRight size={14} className="text-slate-400" />
          </Link>
        </section>

        {/* ── Módulos (2×2) ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {MODULES.map(({ href, icon: Icon, title, description, grad, border, tint, badge, arrow }, i) => (
            <Link
              key={href}
              href={href}
              style={{ animationDelay: `${140 + i * 70}ms` }}
              className={`animate-rise group relative overflow-hidden rounded-3xl border ${border} bg-gradient-to-b ${grad} p-4 sm:p-5 min-h-[190px] flex flex-col transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]`}
            >
              <BracketDecor className={tint} />

              <span className={`relative grid place-items-center w-12 h-12 rounded-2xl ring-1 ${badge}`}>
                <Icon size={22} className={tint} strokeWidth={2} />
              </span>

              <div className="relative mt-auto pt-5">
                <h3 className="font-display font-bold text-white text-[17px] leading-tight">{title}</h3>
                <p className="text-[12.5px] text-slate-400 mt-1.5 leading-snug pr-8">{description}</p>
              </div>

              <span
                className={`absolute bottom-4 right-4 grid place-items-center w-9 h-9 rounded-full ring-1 ${arrow} transition-transform group-hover:translate-x-0.5`}
              >
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>

        {/* ── ¿Cómo funciona? ──────────────────────────────────────── */}
        <section
          className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
          style={{ animationDelay: "440ms" }}
        >
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-5">¿Cómo funciona?</p>
          <div className="flex items-start">
            {STEPS.map(({ n, icon: Icon, label, tint, badge }, i) => (
              <div key={n} className="contents">
                {i > 0 && (
                  <div className="flex-1 mt-[18px] border-t border-dashed border-white/12" />
                )}
                <div className="flex flex-col items-center text-center w-[68px] shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`grid place-items-center w-9 h-9 rounded-full ring-1 ${badge}`}>
                      <Icon size={16} className={tint} strokeWidth={2} />
                    </span>
                    <span className={`font-display font-extrabold text-2xl ${tint}`}>{n}</span>
                  </div>
                  <span className="mt-2.5 text-[11px] text-slate-400 leading-tight">{label}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
