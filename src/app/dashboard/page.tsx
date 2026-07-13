import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AppHeader } from "@/components/AppHeader";
import { BottomNav } from "@/components/BottomNav";
import { redirect } from "next/navigation";
import { SpecialCategory } from "@/generated/prisma/client";
import { Check, X, Clock } from "lucide-react";
import { StandingsTable } from "./StandingsTable";
import { getLastJornadaWinners } from "@/lib/module-access";
import { WinnerStar } from "@/components/WinnerStar";

const SPECIAL_LABELS: Record<SpecialCategory, string> = {
  TOP_SCORER: "Goleador",
  BEST_PLAYER: "Jugador del Torneo",
  BEST_GOALKEEPER: "Mejor Portero",
  BEST_YOUNG_PLAYER: "Mejor Joven",
};

function StatusIcon({ v }: { v: boolean | null }) {
  if (v === true) return <Check size={11} className="text-green-400 shrink-0" />;
  if (v === false) return <X size={11} className="text-red-400 shrink-0" />;
  return <Clock size={10} className="text-slate-600 shrink-0" />;
}

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const userId = session.user.id;

  const [matchBets, specialBets, allUsers, moduleSettings] = await Promise.all([
    prisma.matchBet.findMany({
      where: { userId },
      include: { match: { include: { homeTeam: true, awayTeam: true } } },
      orderBy: { match: { scheduledAt: "asc" } },
    }),
    prisma.specialBet.findMany({
      where: { userId },
      include: { player: { include: { team: true } } },
    }),
    prisma.user.findMany({
      select: {
        id: true, name: true, email: true, image: true,
        payments:  { where: { module: { not: null }, status: "APPROVED" }, select: { module: true } },
        matchBets: { select: { isCorrect: true, poolModule: true } },
        specialBets: { select: { isCorrect: true } },
      },
    }),
    prisma.moduleSettings.findMany(),
  ]);

  const pricedModules = new Set(moduleSettings.filter((s) => Number(s.price) > 0).map((s) => String(s.module)));
  const valid = (paid: Set<string>, m: string) => !pricedModules.has(m) || paid.has(m);

  const LMX_MOD_SET = new Set([
    "LMX_J1","LMX_J2","LMX_J3","LMX_J4","LMX_J5","LMX_J6","LMX_J7","LMX_J8","LMX_J9",
    "LMX_J10","LMX_J11","LMX_J12","LMX_J13","LMX_J14","LMX_J15","LMX_J16","LMX_J17",
  ]);

  const standings = allUsers
    .map((u) => {
      const paid = new Set(u.payments.map((p) => p.module).filter(Boolean) as string[]);
      const conf = (m: string, hasBet: boolean) => (pricedModules.has(m) ? paid.has(m) : hasBet);

      let lmxScore = 0;
      let hasLmxBet = false;
      for (const b of u.matchBets) {
        const mod = b.poolModule;
        if (!mod || !LMX_MOD_SET.has(mod)) continue;
        hasLmxBet = true;
        if (b.isCorrect === true && valid(paid, mod)) lmxScore++;
      }
      const specialCorrect = u.specialBets.filter((s) => s.isCorrect === true).length;
      const hasLmx    = hasLmxBet;
      const hasSpecial = conf("SPECIALS", u.specialBets.length > 0);
      return {
        id: u.id,
        name: u.name ?? u.email ?? "—",
        image: u.image ?? null,
        lmxScore,
        specialScore: valid(paid, "SPECIALS") ? specialCorrect : 0,
        hasLmx,
        hasSpecial,
        hasAny: hasLmx || hasSpecial,
      };
    })
    .map((u) => ({ ...u, total: u.lmxScore + u.specialScore }))
    .sort((a, b) => b.total - a.total);

  const participants = standings.filter((u) => u.hasAny);
  const myRank = participants.findIndex((u) => u.id === userId) + 1;
  const myStats = standings.find((u) => u.id === userId);
  const winnerIds = [...(await getLastJornadaWinners())];
  const iAmWinner = winnerIds.includes(userId);

  const correctMatches = matchBets.filter((b) => b.isCorrect === true).length;
  const gradedMatches = matchBets.filter((b) => b.isCorrect !== null).length;

  return (
    <div className="app-shell min-h-screen text-white">
      <AppHeader />

      <div className="relative z-10 max-w-2xl mx-auto px-4 pt-5 pb-28">
        {/* My rank — featured hero */}
        <div className="animate-rise mb-5 relative overflow-hidden rounded-3xl border border-white/10 stadium-bg shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
          <div className="absolute inset-0 stadium-lines" />
          <div className="relative p-5 sm:p-6 flex items-end justify-between">
            <div>
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-[0.18em] mb-2 flex items-center gap-1.5">
                Mi posición {iAmWinner && <WinnerStar size={13} />}
              </p>
              <p className="font-display text-6xl font-extrabold text-white leading-none tabular-nums">
                #{myRank || "—"}
              </p>
              <p className="text-xs text-slate-400 mt-2">de {participants.length} participantes</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-slate-400 uppercase tracking-[0.16em] mb-1">Puntos</p>
              <p className="font-display text-4xl font-extrabold text-amber-300 leading-none tabular-nums">{myStats?.total ?? 0}</p>
            </div>
          </div>
        </div>

        {/* Ranking + podio por apuesta (pestañas) */}
        <StandingsTable standings={standings} currentUserId={userId} winnerIds={winnerIds} />

        {/* My bets */}
        <div className="grid grid-cols-1 gap-3">
          {/* Match bets */}
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center justify-between">
              <h2 className="font-display text-sm font-bold">Mis partidos</h2>
              <span className="text-xs text-slate-500">{correctMatches}/{gradedMatches} correctos</span>
            </div>
            <div className="divide-y divide-white/5 max-h-56 overflow-y-auto">
              {matchBets.length === 0 ? (
                <p className="text-xs text-slate-600 text-center py-4">Sin apuestas</p>
              ) : matchBets.map((bet) => {
                const m = bet.match;
                const home = m.homeTeam?.name ?? m.homeLabel ?? "?";
                const away = m.awayTeam?.name ?? m.awayLabel ?? "?";
                const pickLabel = bet.pick === "HOME" ? home : bet.pick === "AWAY" ? away : "Empate";
                return (
                  <div key={bet.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <span className="text-xs text-slate-400 truncate">{home} vs {away}</span>
                    <span className={`text-xs font-medium flex items-center gap-1 shrink-0 ${
                      bet.isCorrect === true ? "text-green-400" : bet.isCorrect === false ? "text-red-400" : "text-slate-500"
                    }`}>
                      <StatusIcon v={bet.isCorrect} />
                      {pickLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specials */}
          {specialBets.length > 0 && (
            <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] overflow-hidden">
              <div className="px-4 py-3 border-b border-white/5">
                <h2 className="font-display text-sm font-bold">Premios especiales</h2>
              </div>
              <div className="divide-y divide-white/5">
                {specialBets.map((b) => (
                  <div key={b.id} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">{SPECIAL_LABELS[b.category]}</span>
                    <span className={`text-xs font-medium flex items-center gap-1 ${
                      b.isCorrect === true ? "text-green-400" : b.isCorrect === false ? "text-red-400" : "text-slate-400"
                    }`}>
                      <StatusIcon v={b.isCorrect} />
                      {b.player.team.flag} {b.player.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>

      <BottomNav />
    </div>
  );
}
