import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { NextMatchHero, type PickPeople } from "@/components/NextMatchHero";
import { getApprovedModules, getLastJornadaInfo } from "@/lib/module-access";
import { LMX_JORNADAS } from "@/lib/modules";
import { QuinielaPositionCard, type QuinielaSlot } from "@/components/QuinielaPositionCard";
import { WinnerPopup } from "@/components/WinnerPopup";
import { getJornadaReactions } from "@/app/jornada-actions";
import { Module } from "@/generated/prisma/client";
import Link from "next/link";
import {
  CalendarDays, Star, ArrowRight, BarChart3,
  Target, Gift, Swords, Wallet, Trophy,
} from "lucide-react";

const MODULES = [
  {
    href: "/partidos",
    icon: CalendarDays,
    title: "Jornadas",
    description: "Llena tus picks partido a partido en cada jornada.",
    grad: "from-amber-500/[0.14] to-amber-500/[0.02]",
    border: "border-amber-500/20",
    tint: "text-amber-400",
    badge: "bg-amber-400/10 ring-amber-400/30 halo-gold",
    arrow: "bg-amber-400/[0.12] ring-amber-400/30 text-amber-300",
  },
  {
    href: "/duelos",
    icon: Swords,
    title: "Duelos 1v1",
    description: "Emparejamiento aleatorio. Gana el que más acierte.",
    grad: "from-red-500/[0.14] to-red-500/[0.02]",
    border: "border-red-500/20",
    tint: "text-red-400",
    badge: "bg-red-400/10 ring-red-400/30 halo-red",
    arrow: "bg-red-400/[0.12] ring-red-400/30 text-red-300",
  },
  {
    href: "/ganadores",
    icon: Trophy,
    title: "Ganadores",
    description: "Consulta quién ganó cada quiniela y cuánto se llevó.",
    grad: "from-amber-500/[0.14] to-amber-500/[0.02]",
    border: "border-amber-500/20",
    tint: "text-amber-400",
    badge: "bg-amber-400/10 ring-amber-400/30 halo-gold",
    arrow: "bg-amber-400/[0.12] ring-amber-400/30 text-amber-300",
  },
  {
    href: "/creditos",
    icon: Wallet,
    title: "Mis Créditos",
    description: "Recarga saldo y consulta tus movimientos.",
    grad: "from-green-500/[0.14] to-green-500/[0.02]",
    border: "border-green-500/20",
    tint: "text-green-400",
    badge: "bg-green-400/10 ring-green-400/30 halo-green",
    arrow: "bg-green-400/[0.12] ring-green-400/30 text-green-300",
  },
];

const STEPS = [
  { n: 1, icon: Target,    label: "Haz tus predicciones", tint: "text-amber-400",  badge: "bg-amber-400/10 ring-amber-400/30"   },
  { n: 2, icon: Trophy,    label: "Acumula puntos",        tint: "text-blue-400",   badge: "bg-blue-400/10 ring-blue-400/30"     },
  { n: 3, icon: BarChart3, label: "Compite en la tabla",   tint: "text-red-400",    badge: "bg-red-400/10 ring-red-400/30"       },
  { n: 4, icon: Gift,      label: "Gana premios",          tint: "text-purple-400", badge: "bg-purple-400/10 ring-purple-400/30" },
];


export default async function HomePage() {
  const session = await auth();
  const userId = session!.user.id;

  const now = new Date();
  const liveSince = new Date(now.getTime() - 3.5 * 60 * 60 * 1000);

  // Partido héroe: busca Liga MX en curso primero, luego el próximo
  const liveMatch = await prisma.match.findFirst({
    where: { stage: "JORNADA", scheduledAt: { lte: now, gte: liveSince }, homeScore: null },
    orderBy: { scheduledAt: "desc" },
    include: { homeTeam: true, awayTeam: true },
  });
  const nextMatch = liveMatch ?? await prisma.match.findFirst({
    where: { stage: "JORNADA", scheduledAt: { gt: now } },
    orderBy: { scheduledAt: "asc" },
    include: { homeTeam: true, awayTeam: true },
  });

  // Avatares flotantes: quiénes eligieron cada lado en el partido héroe
  const people: PickPeople = { HOME: [], DRAW: [], AWAY: [] };
  if (nextMatch) {
    const bets = await prisma.matchBet.findMany({
      where: { matchId: nextMatch.id },
      select: { pick: true, user: { select: { id: true, name: true, image: true } } },
    });
    const seen = new Set<string>();
    for (const b of bets) {
      if (seen.has(b.user.id)) continue;
      seen.add(b.user.id);
      const bucket = people[b.pick as keyof PickPeople];
      if (bucket) bucket.push({ id: b.user.id, name: b.user.name ?? "—", image: b.user.image ?? null });
    }
  }

  // Jornada activa: último partido de Liga MX que ya inició
  const lastStarted = await prisma.match.findFirst({
    where: { stage: "JORNADA", scheduledAt: { lte: now } },
    orderBy: { matchNumber: "desc" },
    select: { matchNumber: true },
  });
  // Use LMX_JORNADAS config to resolve module — avoids bogus module strings for
  // extra/desempate match numbers (e.g. 9002) that don't fit the simple formula.
  const activeJornada = lastStarted
    ? (LMX_JORNADAS.find((j) => {
        const inRange = lastStarted.matchNumber >= j.min && lastStarted.matchNumber <= j.max;
        const isExtra = j.extra?.includes(lastStarted.matchNumber) ?? false;
        return inRange || isExtra;
      }) ?? null)
    : null;
  const activeLmxMod: Module | null = activeJornada?.module ?? null;

  // Stats del usuario
  const [matchBetsCorrect, specialBetsCorrect, validModules, lastJornada] = await Promise.all([
    prisma.matchBet.findMany({ where: { userId, isCorrect: true }, select: { poolModule: true } }),
    prisma.specialBet.count({ where: { userId, isCorrect: true } }),
    getApprovedModules(userId),
    getLastJornadaInfo(),
  ]);

  const iWonLastJornada = !!lastJornada && lastJornada.winners.some((w) => w.id === userId);
  const jornadaReactions = lastJornada ? await getJornadaReactions(lastJornada.key) : null;

  const matchPts = matchBetsCorrect.filter(
    (b) => b.poolModule != null && validModules.has(b.poolModule as Module)
  ).length;
  const totalPts = matchPts + (validModules.has("SPECIALS") ? specialBetsCorrect : 0);

  // Posición del usuario en la jornada activa
  let activeSlots: QuinielaSlot[] = [];
  if (activeLmxMod) {
    const modSettings = await prisma.moduleSettings.findUnique({ where: { module: activeLmxMod } });
    const priced = Number(modSettings?.price ?? 0) > 0;
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        payments:  { where: { module: activeLmxMod, status: "APPROVED" }, select: { id: true } },
        matchBets: { where: { poolModule: activeLmxMod }, select: { isCorrect: true } },
      },
    });
    const rows = allUsers
      .filter((u) => (priced ? u.payments.length > 0 : u.matchBets.length > 0))
      .map((u) => ({ id: u.id, points: u.matchBets.filter((b) => b.isCorrect === true).length }));
    const mine = rows.find((r) => r.id === userId);
    if (mine) {
      const rank = rows.filter((r) => r.points > mine.points).length + 1;
      activeSlots = [{
        label:  activeJornada?.label ?? "Jornada activa",
        rank,
        total:  rows.length,
        points: mine.points,
        ranked: rows.some((r) => r.points > 0),
      }];
    }
  }

  const homeName = nextMatch?.homeTeam?.name ?? nextMatch?.homeLabel ?? "Por definir";
  const awayName = nextMatch?.awayTeam?.name ?? nextMatch?.awayLabel ?? "Por definir";

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      {lastJornada && jornadaReactions && (
        <WinnerPopup
          jornadaKey={lastJornada.key}
          label={lastJornada.label}
          winners={lastJornada.winners}
          amIWinner={iWonLastJornada}
          initial={jornadaReactions}
        />
      )}

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28 space-y-4">

        {/* ── Partido héroe ──────────────────────────────────────── */}
        {nextMatch && (
          <NextMatchHero
            matchId={nextMatch.id}
            homeName={homeName}
            awayName={awayName}
            homeFlag={nextMatch.homeTeam?.flag ?? null}
            awayFlag={nextMatch.awayTeam?.flag ?? null}
            homeCode={nextMatch.homeTeam?.code ?? null}
            awayCode={nextMatch.awayTeam?.code ?? null}
            scheduledAt={nextMatch.scheduledAt.toISOString()}
            initialHomeScore={nextMatch.homeScore}
            initialAwayScore={nextMatch.awayScore}
            people={people}
          />
        )}

        {/* ── Posición en jornada activa (o puntos totales) ────── */}
        {activeSlots.length > 0 ? (
          <QuinielaPositionCard slots={activeSlots} />
        ) : (
          <section
            className="animate-rise flex items-center justify-between rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 sm:p-5"
            style={{ animationDelay: "80ms" }}
          >
            <div className="flex items-center gap-4">
              <span className="grid place-items-center w-12 h-12 rounded-full bg-amber-400/10 ring-1 ring-amber-400/30 halo-gold">
                <Star size={22} className="text-amber-400" strokeWidth={2} />
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
              <BarChart3 size={15} className="text-amber-400" />
              Ver tabla
              <ArrowRight size={14} className="text-slate-400" />
            </Link>
          </section>
        )}

        {/* ── Módulos (2×2) ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {MODULES.map(({ href, icon: Icon, title, description, grad, border, tint, badge, arrow }, i) => (
            <Link
              key={href}
              href={href}
              style={{ animationDelay: `${140 + i * 70}ms` }}
              className={`animate-rise group relative overflow-hidden rounded-3xl border ${border} bg-gradient-to-b ${grad} p-4 sm:p-5 min-h-[190px] flex flex-col transition-all hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.98]`}
            >
              {/* Decoración: círculos concéntricos estilo balón */}
              <span className={`absolute -right-3 top-1/2 -translate-y-1/2 w-24 h-24 rounded-full border-2 opacity-[0.07] ${tint.replace("text-", "border-")}`} />
              <span className={`absolute -right-6 top-1/2 -translate-y-1/2 w-36 h-36 rounded-full border opacity-[0.05] ${tint.replace("text-", "border-")}`} />

              <span className={`relative grid place-items-center w-12 h-12 rounded-2xl ring-1 ${badge}`}>
                <Icon size={22} className={tint} strokeWidth={2} />
              </span>

              <div className="relative mt-auto pt-5">
                <h3 className="font-display font-bold text-white text-[17px] leading-tight">{title}</h3>
                <p className="text-[12.5px] text-slate-400 mt-1.5 leading-snug pr-8">{description}</p>
              </div>

              <span className={`absolute bottom-4 right-4 grid place-items-center w-9 h-9 rounded-full ring-1 ${arrow} transition-transform group-hover:translate-x-0.5`}>
                <ArrowRight size={16} />
              </span>
            </Link>
          ))}
        </div>

        {/* ── ¿Cómo funciona? ────────────────────────────────────── */}
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
