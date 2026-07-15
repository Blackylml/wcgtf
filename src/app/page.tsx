import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { NextMatchHero, type PickPeople } from "@/components/NextMatchHero";
import { getApprovedModules, getLastJornadaInfo } from "@/lib/module-access";
import { QuinielaPositionCard, type QuinielaSlot } from "@/components/QuinielaPositionCard";
import { WinnerPopup } from "@/components/WinnerPopup";
import { getJornadaReactions } from "@/app/jornada-actions";
import { Module } from "@/generated/prisma/client";
import Link from "next/link";
import { LMX_JORNADAS } from "@/lib/modules";
import {
  CalendarDays, Star, ArrowRight, BarChart3,
  Swords, Wallet, Trophy, Medal,
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
    href: "/especiales",
    icon: Star,
    title: "Especiales",
    description: "Goleador, MVP, Mejor portero y Campeón de la Liguilla.",
    grad: "from-purple-500/[0.14] to-purple-500/[0.02]",
    border: "border-purple-500/20",
    tint: "text-purple-400",
    badge: "bg-purple-400/10 ring-purple-400/30 halo-purple",
    arrow: "bg-purple-400/[0.12] ring-purple-400/30 text-purple-300",
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

// J1=1001-1009, J2=1010-1018 … (9 partidos por jornada)
function matchNumToJornada(matchNumber: number) {
  return Math.ceil((matchNumber - 1000) / 9);
}

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
  const activeJornadaNum = lastStarted ? matchNumToJornada(lastStarted.matchNumber) : 0;
  const activeLmxMod: Module | null = activeJornadaNum > 0
    ? (`LMX_J${activeJornadaNum}` as Module)
    : null;

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
        label:  `Jornada ${activeJornadaNum}`,
        rank,
        total:  rows.length,
        points: mine.points,
        ranked: rows.some((r) => r.points > 0),
      }];
    }
  }

  // ── Ganadores anteriores ─────────────────────────────────────────────
  const allJornadaMatches = await prisma.match.findMany({
    where: { stage: "JORNADA", matchNumber: { gte: 1001, lte: 9000 } },
    select: { matchNumber: true, homeScore: true },
  });
  const completedJornadas = LMX_JORNADAS.filter((j) => {
    const inRange = allJornadaMatches.filter((m) => m.matchNumber >= j.min && m.matchNumber <= j.max);
    return inRange.length > 0 && inRange.every((m) => m.homeScore !== null);
  });
  type WinnerRow = { quiniela: string; winnerName: string; winnerImage: string | null; aciertos: number; prize: number };
  const pastWinners: WinnerRow[] = (
    await Promise.all(
      completedJornadas.map(async (j) => {
        const top = await prisma.matchBet.groupBy({
          by: ["userId"],
          where: { poolModule: j.module as Module, isCorrect: true },
          _count: { id: true },
          orderBy: { _count: { id: "desc" } },
          take: 1,
        });
        const topEntry = top[0];
        if (!topEntry) return null;
        const winner = await prisma.user.findUnique({
          where: { id: topEntry.userId },
          select: { name: true, image: true, email: true },
        });
        const prizeAgg = await prisma.payment.aggregate({
          where: { module: j.module as Module, status: "APPROVED" },
          _sum: { amount: true },
        });
        return {
          quiniela: j.label,
          winnerName: winner?.name ?? winner?.email ?? "—",
          winnerImage: winner?.image ?? null,
          aciertos: topEntry._count.id,
          prize: Number(prizeAgg._sum.amount ?? 0),
        };
      })
    )
  ).filter((r): r is WinnerRow => r !== null);

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

        {/* ── Ganadores anteriores ───────────────────────────────── */}
        <section
          className="animate-rise rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5"
          style={{ animationDelay: "440ms" }}
        >
          <p className="flex items-center gap-2 text-[11px] font-bold text-slate-400 uppercase tracking-[0.18em] mb-4">
            <Trophy size={13} className="text-amber-400" /> Ganadores anteriores
          </p>
          {pastWinners.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-6 text-slate-600">
              <Medal size={28} className="opacity-30" />
              <p className="text-xs">Aún no hay ganadores — ¡juega la primera jornada!</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-1">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-slate-600 text-[10px] uppercase tracking-wider">
                    <th className="text-left pb-2 pl-1 font-semibold">Quiniela</th>
                    <th className="text-left pb-2 font-semibold">Ganador</th>
                    <th className="text-right pb-2 font-semibold tabular-nums">Aciertos</th>
                    <th className="text-right pb-2 pr-1 font-semibold tabular-nums">Premio</th>
                  </tr>
                </thead>
                <tbody>
                  {pastWinners.map((w, i) => (
                    <tr key={i} className="border-t border-white/[0.05]">
                      <td className="py-2 pl-1 text-slate-300 font-medium">{w.quiniela}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {w.winnerImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={w.winnerImage} alt="" className="w-5 h-5 rounded-full object-cover shrink-0 ring-1 ring-white/15" />
                          ) : (
                            <span className="w-5 h-5 rounded-full bg-amber-400/20 ring-1 ring-amber-400/30 flex items-center justify-center shrink-0">
                              <Trophy size={10} className="text-amber-400" />
                            </span>
                          )}
                          <span className="text-white font-semibold truncate">{w.winnerName}</span>
                        </div>
                      </td>
                      <td className="py-2 text-right text-amber-300 font-bold tabular-nums">{w.aciertos}</td>
                      <td className="py-2 pr-1 text-right text-emerald-300 font-semibold tabular-nums">
                        {w.prize > 0 ? `$${w.prize.toFixed(0)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </div>
  );
}
